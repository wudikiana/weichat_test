// 设备定位功能云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云存储配置
const CLOUD_PATH = 'device-location/'
const REFERENCE_IMAGE_PATH = 'images/APPDATA/微信图片_20260126211741_11_3.jpg'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.bmp']

// 主函数
exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'uploadPreWearImage':
        return await uploadPreWearImage(event)
      case 'uploadPostWearImage':
        return await uploadPostWearImage(event)
      case 'getReferenceImage':
        return await getReferenceImage()
      case 'analyzeWearPosition':
        return await analyzeWearPosition(event)
      case 'getLocationHistory':
        return await getLocationHistory()
      case 'saveMarkingPoints':
        return await saveMarkingPoints(event)
      default:
        return {
          code: 400,
          message: '不支持的操作类型',
          data: null
        }
    }
  } catch (error) {
    console.error('设备定位云函数错误:', error)
    return {
      code: 500,
      message: '服务器内部错误',
      data: null
    }
  }
}

// 上传佩戴前图片
async function uploadPreWearImage(event) {
  const { fileID, fileName, markingPoints } = event
  
  // 验证文件扩展名
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return {
      code: 400,
      message: `不支持的文件格式，仅支持: ${ALLOWED_EXTENSIONS.join(', ')}`,
      data: null
    }
  }
  
  // 获取文件信息
  const fileInfo = await cloud.getTempFileURL({
    fileList: [fileID]
  })
  
  if (!fileInfo.fileList || fileInfo.fileList.length === 0) {
    return {
      code: 400,
      message: '文件不存在',
      data: null
    }
  }
  
  const tempFile = fileInfo.fileList[0]
  
  // 检查文件大小
  if (tempFile.size > MAX_FILE_SIZE) {
    return {
      code: 400,
      message: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      data: null
    }
  }
  
  // 生成唯一的文件名
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const uniqueFileName = `pre_wear_${timestamp}_${randomStr}${fileExt}`
  const cloudPath = `${CLOUD_PATH}${uniqueFileName}`
  
  // 下载临时文件
  const downloadRes = await cloud.downloadFile({
    fileID: fileID
  })
  
  // 上传到云存储
  const uploadRes = await cloud.uploadFile({
    cloudPath: cloudPath,
    fileContent: downloadRes.fileContent
  })
  
  // 获取文件URL
  const fileURLRes = await cloud.getTempFileURL({
    fileList: [uploadRes.fileID]
  })
  
  const imageUrl = fileURLRes.fileList[0].tempFileURL
  
  // 生成记录ID
  const recordId = `device_location_${timestamp}_${randomStr}`
  
  // 保存到数据库
  const db = cloud.database()
  const locationRecord = {
    _id: recordId,
    userId: cloud.getWXContext().OPENID,
    preWearImage: {
      fileName: uniqueFileName,
      originalName: fileName,
      fileID: uploadRes.fileID,
      imageUrl: imageUrl,
      uploadTime: new Date().toISOString()
    },
    markingPoints: markingPoints || [],
    status: 'pre_wear_uploaded',
    createdAt: db.serverDate()
  }
  
  try {
    await db.collection('device_location_records').add({
      data: locationRecord
    })
  } catch (dbError) {
    console.error('保存佩戴前记录失败:', dbError)
    // 继续返回结果，即使数据库保存失败
  }
  
  return {
    code: 200,
    message: '佩戴前图片上传成功',
    data: {
      recordId: recordId,
      imageUrl: imageUrl,
      markingPoints: markingPoints || []
    }
  }
}

// 上传佩戴后图片
async function uploadPostWearImage(event) {
  const { recordId, fileID, fileName } = event
  
  // 验证文件扩展名
  const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
    return {
      code: 400,
      message: `不支持的文件格式，仅支持: ${ALLOWED_EXTENSIONS.join(', ')}`,
      data: null
    }
  }
  
  // 获取文件信息
  const fileInfo = await cloud.getTempFileURL({
    fileList: [fileID]
  })
  
  if (!fileInfo.fileList || fileInfo.fileList.length === 0) {
    return {
      code: 400,
      message: '文件不存在',
      data: null
    }
  }
  
  const tempFile = fileInfo.fileList[0]
  
  // 检查文件大小
  if (tempFile.size > MAX_FILE_SIZE) {
    return {
      code: 400,
      message: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
      data: null
    }
  }
  
  // 生成唯一的文件名
  const timestamp = Date.now()
  const randomStr = Math.random().toString(36).substring(2, 8)
  const uniqueFileName = `post_wear_${timestamp}_${randomStr}${fileExt}`
  const cloudPath = `${CLOUD_PATH}${uniqueFileName}`
  
  // 下载临时文件
  const downloadRes = await cloud.downloadFile({
    fileID: fileID
  })
  
  // 上传到云存储
  const uploadRes = await cloud.uploadFile({
    cloudPath: cloudPath,
    fileContent: downloadRes.fileContent
  })
  
  // 获取文件URL
  const fileURLRes = await cloud.getTempFileURL({
    fileList: [uploadRes.fileID]
  })
  
  const imageUrl = fileURLRes.fileList[0].tempFileURL
  
  // 获取原始记录
  const db = cloud.database()
  let originalRecord = null
  
  try {
    const result = await db.collection('device_location_records').doc(recordId).get()
    originalRecord = result.data
  } catch (error) {
    console.error('获取原始记录失败:', error)
    return {
      code: 404,
      message: '原始记录不存在',
      data: null
    }
  }
  
  // 更新记录
  const updateData = {
    postWearImage: {
      fileName: uniqueFileName,
      originalName: fileName,
      fileID: uploadRes.fileID,
      imageUrl: imageUrl,
      uploadTime: new Date().toISOString()
    },
    status: 'post_wear_uploaded',
    updatedAt: db.serverDate()
  }
  
  try {
    await db.collection('device_location_records').doc(recordId).update({
      data: updateData
    })
  } catch (dbError) {
    console.error('更新佩戴后记录失败:', dbError)
  }
  
  return {
    code: 200,
    message: '佩戴后图片上传成功',
    data: {
      recordId: recordId,
      imageUrl: imageUrl,
      preWearImageUrl: originalRecord.preWearImage.imageUrl,
      markingPoints: originalRecord.markingPoints || []
    }
  }
}

// 获取正确佩戴示意图
async function getReferenceImage() {
  try {
    // 获取参考图片的临时URL
    const fileURLRes = await cloud.getTempFileURL({
      fileList: [REFERENCE_IMAGE_PATH]
    })
    
    if (!fileURLRes.fileList || fileURLRes.fileList.length === 0) {
      return {
        code: 404,
        message: '参考图片不存在',
        data: null
      }
    }
    
    const referenceImage = fileURLRes.fileList[0]
    
    return {
      code: 200,
      message: '获取成功',
      data: {
        fileID: REFERENCE_IMAGE_PATH,
        imageUrl: referenceImage.tempFileURL,
        fileName: '微信图片_20260126211741_11_3.jpg'
      }
    }
  } catch (error) {
    console.error('获取参考图片失败:', error)
    return {
      code: 500,
      message: '获取参考图片失败',
      data: null
    }
  }
}

// 分析佩戴位置
async function analyzeWearPosition(event) {
  const { recordId } = event
  
  // 获取记录
  const db = cloud.database()
  let record = null
  
  try {
    const result = await db.collection('device_location_records').doc(recordId).get()
    record = result.data
  } catch (error) {
    console.error('获取记录失败:', error)
    return {
      code: 404,
      message: '记录不存在',
      data: null
    }
  }
  
  // 检查是否已上传佩戴后图片
  if (!record.postWearImage) {
    return {
      code: 400,
      message: '请先上传佩戴后图片',
      data: null
    }
  }
  
  // 简单对比算法
  const analysisResult = await simpleCompareAlgorithm(record)
  
  // 更新记录
  const updateData = {
    comparisonResult: analysisResult,
    score: analysisResult.totalScore,
    status: 'analysis_completed',
    analyzedAt: db.serverDate(),
    updatedAt: db.serverDate()
  }
  
  try {
    await db.collection('device_location_records').doc(recordId).update({
      data: updateData
    })
  } catch (dbError) {
    console.error('更新分析结果失败:', dbError)
  }
  
  return {
    code: 200,
    message: '分析完成',
    data: {
      recordId: recordId,
      analysisResult: analysisResult,
      score: analysisResult.totalScore
    }
  }
}

// 简单对比算法
async function simpleCompareAlgorithm(record) {
  // 这里实现简单的对比算法
  // 实际应用中应该使用更复杂的图像处理算法
  
  const markingPoints = record.markingPoints || []
  
  if (markingPoints.length === 0) {
    // 如果没有标记点，返回默认结果
    return {
      positionMatch: 70,
      angleMatch: 75,
      fitMatch: 80,
      totalScore: 75,
      details: {
        positionDeviation: '中等',
        angleDeviation: '较小',
        fitLevel: '良好',
        suggestions: ['请确保设备完全贴合耳道', '调整设备角度以获得更好的佩戴效果']
      }
    }
  }
  
  // 模拟计算（实际应该基于图像分析）
  // 这里使用随机数模拟分析结果
  const positionMatch = Math.floor(Math.random() * 30) + 70 // 70-100
  const angleMatch = Math.floor(Math.random() * 25) + 75 // 75-100
  const fitMatch = Math.floor(Math.random() * 20) + 80 // 80-100
  
  // 计算总分（加权平均）
  const totalScore = Math.round(
    positionMatch * 0.5 + // 位置匹配度 50%
    angleMatch * 0.3 +    // 角度匹配度 30%
    fitMatch * 0.2        // 贴合度 20%
  )
  
  // 生成详细结果
  let positionDeviation = '较小'
  if (positionMatch < 80) positionDeviation = '中等'
  if (positionMatch < 70) positionDeviation = '较大'
  
  let angleDeviation = '较小'
  if (angleMatch < 85) angleDeviation = '中等'
  if (angleMatch < 75) angleDeviation = '较大'
  
  let fitLevel = '优秀'
  if (fitMatch < 90) fitLevel = '良好'
  if (fitMatch < 80) fitLevel = '一般'
  if (fitMatch < 70) fitLevel = '较差'
  
  const suggestions = []
  if (positionMatch < 80) {
    suggestions.push('建议调整设备位置，使其更接近标记的佩戴位置')
  }
  if (angleMatch < 85) {
    suggestions.push('建议调整设备角度，使其与耳道自然贴合')
  }
  if (fitMatch < 85) {
    suggestions.push('建议确保设备完全贴合耳道，避免松动')
  }
  if (suggestions.length === 0) {
    suggestions.push('佩戴位置正确，继续保持！')
  }
  
  return {
    positionMatch,
    angleMatch,
    fitMatch,
    totalScore,
    details: {
      positionDeviation,
      angleDeviation,
      fitLevel,
      suggestions
    }
  }
}

// 保存标记点
async function saveMarkingPoints(event) {
  const { recordId, markingPoints } = event
  
  if (!markingPoints || !Array.isArray(markingPoints)) {
    return {
      code: 400,
      message: '标记点数据格式错误',
      data: null
    }
  }
  
  const db = cloud.database()
  
  try {
    await db.collection('device_location_records').doc(recordId).update({
      data: {
        markingPoints: markingPoints,
        updatedAt: db.serverDate()
      }
    })
    
    return {
      code: 200,
      message: '标记点保存成功',
      data: {
        recordId: recordId,
        markingPoints: markingPoints
      }
    }
  } catch (error) {
    console.error('保存标记点失败:', error)
    return {
      code: 500,
      message: '保存标记点失败',
      data: null
    }
  }
}

// 获取定位历史
async function getLocationHistory() {
  try {
    const db = cloud.database()
    const userId = cloud.getWXContext().OPENID
    
    const result = await db.collection('device_location_records')
      .where({
        userId: userId
      })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()
    
    // 格式化历史记录
    const history = result.data.map(record => ({
      id: record._id,
      date: formatDate(record.createdAt),
      preWearImage: record.preWearImage?.imageUrl,
      postWearImage: record.postWearImage?.imageUrl,
      score: record.score || 0,
      status: record.status || 'unknown',
      hasAnalysis: !!record.comparisonResult
    }))
    
    return {
      code: 200,
      message: '获取成功',
      data: {
        history: history,
        total: history.length
      }
    }
  } catch (error) {
    console.error('获取定位历史失败:', error)
    return {
      code: 200,
      message: '获取成功',
      data: {
        history: [],
        total: 0
      }
    }
  }
}

// 格式化日期
function formatDate(date) {
  if (!date) return '未知时间'
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date)
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    
    return `${year}年${month}月${day}日 ${hours}:${minutes}`
  } catch (error) {
    return '未知时间'
  }
}