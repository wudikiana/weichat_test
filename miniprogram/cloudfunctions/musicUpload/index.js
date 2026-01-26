// 音乐上传云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云存储配置
const CLOUD_PATH = 'musics/user_uploads/'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac']

// 主函数
exports.main = async (event, context) => {
  const { action, fileID, fileName, fileContent } = event
  
  try {
    switch (action) {
      case 'upload':
        return await uploadMusic(fileID, fileName)
      case 'list':
        return await listUserMusic()
      case 'delete':
        return await deleteMusic(fileName)
      case 'getUrl':
        return await getMusicUrl(fileName)
      default:
        return {
          code: 400,
          message: '不支持的操作类型',
          data: null
        }
    }
  } catch (error) {
    console.error('音乐上传云函数错误:', error)
    return {
      code: 500,
      message: '服务器内部错误',
      data: null
    }
  }
}

// 上传音乐
async function uploadMusic(fileID, fileName) {
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
  const uniqueFileName = `${timestamp}_${randomStr}${fileExt}`
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
  
  // 获取文件ID
  const fileIDRes = await cloud.getTempFileURL({
    fileList: [uploadRes.fileID]
  })
  
  return {
    code: 200,
    message: '上传成功',
    data: {
      fileName: uniqueFileName,
      originalName: fileName,
      fileID: uploadRes.fileID,
      tempFileURL: fileIDRes.fileList[0].tempFileURL,
      size: tempFile.size,
      uploadTime: new Date().toISOString()
    }
  }
}

// 列出用户音乐
async function listUserMusic() {
  try {
    // 获取云存储文件列表
    const res = await cloud.getTempFileURL({
      fileList: []
    })
    
    // 过滤用户上传的音乐文件
    const userMusic = res.fileList
      .filter(file => file.fileID.includes(CLOUD_PATH))
      .map(file => {
        const fileName = file.fileID.split('/').pop()
        return {
          fileName: fileName,
          fileID: file.fileID,
          tempFileURL: file.tempFileURL,
          soundType: `custom_${fileName}`,
          displayName: fileName.replace(/^\d+_/, '').replace(/\.[^/.]+$/, '')
        }
      })
    
    return {
      code: 200,
      message: '获取成功',
      data: {
        musicList: userMusic,
        total: userMusic.length
      }
    }
  } catch (error) {
    console.error('列出用户音乐失败:', error)
    return {
      code: 200,
      message: '获取成功',
      data: {
        musicList: [],
        total: 0
      }
    }
  }
}

// 删除音乐
async function deleteMusic(fileName) {
  try {
    const cloudPath = `${CLOUD_PATH}${fileName}`
    
    // 删除文件
    await cloud.deleteFile({
      fileList: [cloudPath]
    })
    
    return {
      code: 200,
      message: '删除成功',
      data: {
        fileName: fileName
      }
    }
  } catch (error) {
    console.error('删除音乐失败:', error)
    return {
      code: 500,
      message: '删除失败',
      data: null
    }
  }
}

// 获取音乐URL
async function getMusicUrl(fileName) {
  try {
    const cloudPath = `${CLOUD_PATH}${fileName}`
    
    const res = await cloud.getTempFileURL({
      fileList: [cloudPath]
    })
    
    if (!res.fileList || res.fileList.length === 0) {
      return {
        code: 404,
        message: '文件不存在',
        data: null
      }
    }
    
    return {
      code: 200,
      message: '获取成功',
      data: {
        fileName: fileName,
        tempFileURL: res.fileList[0].tempFileURL,
        fileID: res.fileList[0].fileID
      }
    }
  } catch (error) {
    console.error('获取音乐URL失败:', error)
    return {
      code: 500,
      message: '获取失败',
      data: null
    }
  }
}