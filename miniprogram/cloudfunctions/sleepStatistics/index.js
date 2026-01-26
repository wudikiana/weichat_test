// 睡眠统计云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

// 主函数
exports.main = async (event, context) => {
  const { userId, startDate, endDate, type = 'week' } = event
  
  try {
    // 验证参数
    if (!userId) {
      return {
        code: 400,
        message: '缺少用户ID参数',
        data: null
      }
    }
    
    // 根据类型确定日期范围
    let dateRange = getDateRange(type, startDate, endDate)
    
    // 查询睡眠记录
    const records = await getSleepRecords(userId, dateRange.start, dateRange.end)
    
    if (records.length === 0) {
      return {
        code: 200,
        message: '暂无睡眠记录',
        data: {
          statistics: getEmptyStatistics(),
          records: [],
          suggestions: []
        }
      }
    }
    
    // 计算统计数据
    const statistics = calculateStatistics(records)
    
    // 生成建议
    const suggestions = generateSuggestions(statistics)
    
    // 格式化记录数据
    const formattedRecords = formatRecords(records)
    
    return {
      code: 200,
      message: '获取成功',
      data: {
        statistics,
        records: formattedRecords,
        suggestions,
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
          type: type
        }
      }
    }
    
  } catch (error) {
    console.error('睡眠统计云函数错误:', error)
    return {
      code: 500,
      message: '服务器内部错误',
      data: null
    }
  }
}

// 获取日期范围
function getDateRange(type, startDate, endDate) {
  const now = new Date()
  let start, end
  
  switch (type) {
    case 'week':
      // 过去7天
      end = new Date(now)
      start = new Date(now)
      start.setDate(start.getDate() - 6)
      break
      
    case 'month':
      // 过去30天
      end = new Date(now)
      start = new Date(now)
      start.setDate(start.getDate() - 29)
      break
      
    case 'custom':
      // 自定义日期范围
      start = startDate ? new Date(startDate) : new Date(now)
      end = endDate ? new Date(endDate) : new Date(now)
      if (startDate) start.setHours(0, 0, 0, 0)
      if (endDate) end.setHours(23, 59, 59, 999)
      break
      
    default:
      // 默认过去7天
      end = new Date(now)
      start = new Date(now)
      start.setDate(start.getDate() - 6)
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

// 获取睡眠记录
async function getSleepRecords(userId, startDate, endDate) {
  const result = await db.collection('sleep_records')
    .where({
      userId: userId,
      date: _.gte(startDate).and(_.lte(endDate))
    })
    .orderBy('date', 'desc')
    .get()
  
  return result.data
}

// 计算统计数据
function calculateStatistics(records) {
  if (records.length === 0) {
    return getEmptyStatistics()
  }
  
  // 计算总时长和平均时长
  const totalHours = records.reduce((sum, record) => sum + record.actualHours, 0)
  const averageHours = totalHours / records.length
  
  // 计算平均质量
  const totalQuality = records.reduce((sum, record) => sum + (record.quality || 3), 0)
  const averageQuality = totalQuality / records.length
  
  // 查找最佳和最差记录
  let bestRecord = records[0]
  let worstRecord = records[0]
  let maxHours = records[0].actualHours
  let minHours = records[0].actualHours
  
  records.forEach(record => {
    if (record.actualHours > maxHours) {
      maxHours = record.actualHours
      bestRecord = record
    }
    if (record.actualHours < minHours) {
      minHours = record.actualHours
      worstRecord = record
    }
  })
  
  // 计算连续记录天数
  const continuousDays = calculateContinuousDays(records)
  
  // 计算睡眠阶段分布（模拟数据）
  const sleepStages = calculateSleepStages(records, averageHours, averageQuality)
  
  return {
    totalRecords: records.length,
    averageHours: parseFloat(averageHours.toFixed(1)),
    averageQuality: parseFloat(averageQuality.toFixed(1)),
    qualityPercentage: Math.round(averageQuality * 20), // 转换为百分比
    bestDay: {
      date: bestRecord.date,
      hours: bestRecord.actualHours,
      quality: bestRecord.quality || 3
    },
    worstDay: {
      date: worstRecord.date,
      hours: worstRecord.actualHours,
      quality: worstRecord.quality || 3
    },
    continuousDays,
    sleepStages,
    trend: calculateTrend(records)
  }
}

// 计算连续记录天数
function calculateContinuousDays(records) {
  if (records.length === 0) return 0
  
  // 按日期排序（从新到旧）
  const sortedRecords = [...records].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )
  
  let continuousDays = 1
  for (let i = 1; i < sortedRecords.length; i++) {
    const prevDate = new Date(sortedRecords[i-1].date)
    const currDate = new Date(sortedRecords[i].date)
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffDays === 1) {
      continuousDays++
    } else {
      break
    }
  }
  
  return continuousDays
}

// 计算睡眠阶段分布
function calculateSleepStages(records, averageHours, averageQuality) {
  // 基于平均质量分配睡眠阶段比例
  let deepSleepPercent, lightSleepPercent, remSleepPercent
  
  if (averageQuality >= 4) {
    // 高质量睡眠
    deepSleepPercent = 35
    lightSleepPercent = 50
    remSleepPercent = 15
  } else if (averageQuality >= 3) {
    // 中等质量睡眠
    deepSleepPercent = 25
    lightSleepPercent = 60
    remSleepPercent = 15
  } else {
    // 低质量睡眠
    deepSleepPercent = 20
    lightSleepPercent = 65
    remSleepPercent = 15
  }
  
  return {
    deepSleep: {
      percent: deepSleepPercent,
      hours: parseFloat((averageHours * deepSleepPercent / 100).toFixed(1))
    },
    lightSleep: {
      percent: lightSleepPercent,
      hours: parseFloat((averageHours * lightSleepPercent / 100).toFixed(1))
    },
    remSleep: {
      percent: remSleepPercent,
      hours: parseFloat((averageHours * remSleepPercent / 100).toFixed(1))
    }
  }
}

// 计算趋势
function calculateTrend(records) {
  if (records.length < 2) {
    return 'stable' // 稳定
  }
  
  // 按日期排序（从旧到新）
  const sortedRecords = [...records].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )
  
  // 计算最近3天的平均时长和前3天的平均时长
  const recentCount = Math.min(3, sortedRecords.length)
  const olderCount = Math.min(3, sortedRecords.length - recentCount)
  
  let recentSum = 0
  let olderSum = 0
  
  for (let i = sortedRecords.length - 1; i >= sortedRecords.length - recentCount; i--) {
    recentSum += sortedRecords[i].actualHours
  }
  
  for (let i = sortedRecords.length - recentCount - 1; i >= sortedRecords.length - recentCount - olderCount; i--) {
    if (i >= 0) {
      olderSum += sortedRecords[i].actualHours
    }
  }
  
  const recentAvg = recentSum / recentCount
  const olderAvg = olderSum / olderCount
  
  if (recentAvg > olderAvg + 0.5) {
    return 'improving' // 改善
  } else if (recentAvg < olderAvg - 0.5) {
    return 'declining' // 下降
  } else {
    return 'stable' // 稳定
  }
}

// 生成建议
function generateSuggestions(statistics) {
  const suggestions = []
  const { averageHours, averageQuality, continuousDays, trend } = statistics
  
  // 时长建议
  if (averageHours < 7) {
    suggestions.push({
      type: 'duration',
      level: 'warning',
      title: '睡眠时长不足',
      content: '您的平均睡眠时长不足7小时，建议增加睡眠时间至7-9小时。'
    })
  } else if (averageHours > 9) {
    suggestions.push({
      type: 'duration',
      level: 'info',
      title: '睡眠时间偏长',
      content: '您的平均睡眠时间超过9小时，建议保持7-9小时的睡眠时长。'
    })
  } else {
    suggestions.push({
      type: 'duration',
      level: 'success',
      title: '睡眠时长良好',
      content: '您的睡眠时长在健康范围内，请继续保持。'
    })
  }
  
  // 质量建议
  if (averageQuality < 3) {
    suggestions.push({
      type: 'quality',
      level: 'warning',
      title: '睡眠质量待提高',
      content: '您的睡眠质量评分较低，建议改善睡眠环境，睡前避免使用电子设备。'
    })
  } else if (averageQuality >= 4) {
    suggestions.push({
      type: 'quality',
      level: 'success',
      title: '睡眠质量优秀',
      content: '您的睡眠质量很好，请继续保持良好的睡眠习惯。'
    })
  } else {
    suggestions.push({
      type: 'quality',
      level: 'info',
      title: '睡眠质量良好',
      content: '您的睡眠质量良好，仍有提升空间。'
    })
  }
  
  // 连续性建议
  if (continuousDays >= 7) {
    suggestions.push({
      type: 'consistency',
      level: 'success',
      title: '规律作息',
      content: `您已连续记录${continuousDays}天，保持规律作息对健康很重要。`
    })
  } else if (continuousDays >= 3) {
    suggestions.push({
      type: 'consistency',
      level: 'info',
      title: '继续坚持',
      content: `您已连续记录${continuousDays}天，继续坚持记录睡眠数据。`
    })
  }
  
  // 趋势建议
  if (trend === 'improving') {
    suggestions.push({
      type: 'trend',
      level: 'success',
      title: '睡眠改善中',
      content: '您的睡眠趋势正在改善，请继续保持良好的睡眠习惯。'
    })
  } else if (trend === 'declining') {
    suggestions.push({
      type: 'trend',
      level: 'warning',
      title: '睡眠趋势下降',
      content: '近期睡眠时长有所下降，请注意调整作息时间。'
    })
  }
  
  return suggestions
}

// 格式化记录
function formatRecords(records) {
  return records.map(record => {
    const qualityText = getQualityText(record.quality || 3)
    
    return {
      date: record.date,
      status: qualityText,
      timeRange: `${record.sleepTime || '22:30'} - ${record.wakeupTime || '06:30'}`,
      duration: record.actualHours,
      quality: record.quality || 3,
      notes: record.notes || ''
    }
  })
}

// 获取质量文本
function getQualityText(qualityScore) {
  if (qualityScore >= 4.5) return '优秀'
  if (qualityScore >= 4.0) return '很好'
  if (qualityScore >= 3.0) return '良好'
  if (qualityScore >= 2.0) return '一般'
  return '较差'
}

// 获取空统计数据
function getEmptyStatistics() {
  return {
    totalRecords: 0,
    averageHours: 0,
    averageQuality: 0,
    qualityPercentage: 0,
    bestDay: { date: '暂无', hours: 0, quality: 0 },
    worstDay: { date: '暂无', hours: 0, quality: 0 },
    continuousDays: 0,
    sleepStages: {
      deepSleep: { percent: 0, hours: 0 },
      lightSleep: { percent: 0, hours: 0 },
      remSleep: { percent: 0, hours: 0 }
    },
    trend: 'stable'
  }
}
