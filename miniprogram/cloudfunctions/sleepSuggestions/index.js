// 睡眠建议生成云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 主函数
exports.main = async (event, context) => {
  const { userId, days = 7 } = event
  
  try {
    // 验证参数
    if (!userId) {
      return {
        code: 400,
        message: '缺少用户ID参数',
        data: null
      }
    }
    
    // 获取最近N天的睡眠记录
    const records = await getRecentSleepRecords(userId, days)
    
    if (records.length === 0) {
      return {
        code: 200,
        message: '暂无睡眠记录',
        data: {
          suggestions: getDefaultSuggestions(),
          analysis: null
        }
      }
    }
    
    // 分析睡眠数据
    const analysis = analyzeSleepData(records)
    
    // 生成个性化建议
    const suggestions = generatePersonalizedSuggestions(analysis)
    
    return {
      code: 200,
      message: '获取成功',
      data: {
        suggestions,
        analysis,
        recordCount: records.length,
        dateRange: `${days}天`
      }
    }
    
  } catch (error) {
    console.error('睡眠建议云函数错误:', error)
    return {
      code: 500,
      message: '服务器内部错误',
      data: null
    }
  }
}

// 获取最近N天的睡眠记录
async function getRecentSleepRecords(userId, days) {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - (days - 1))
  
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]
  
  const result = await db.collection('sleep_records')
    .where({
      userId: userId,
      date: db.command.gte(startDateStr).and(db.command.lte(endDateStr))
    })
    .orderBy('date', 'desc')
    .get()
  
  return result.data
}

// 分析睡眠数据
function analyzeSleepData(records) {
  if (records.length === 0) {
    return {
      averageHours: 0,
      averageQuality: 0,
      consistency: 0,
      bedtimeRegularity: 0,
      wakeupRegularity: 0,
      issues: []
    }
  }
  
  // 计算平均时长和质量
  const totalHours = records.reduce((sum, record) => sum + record.actualHours, 0)
  const averageHours = totalHours / records.length
  
  const totalQuality = records.reduce((sum, record) => sum + (record.quality || 3), 0)
  const averageQuality = totalQuality / records.length
  
  // 分析就寝时间规律性
  const bedtimeRegularity = analyzeTimeRegularity(records, 'sleepTime')
  
  // 分析起床时间规律性
  const wakeupRegularity = analyzeTimeRegularity(records, 'wakeupTime')
  
  // 分析一致性（连续记录天数）
  const consistency = analyzeConsistency(records)
  
  // 识别睡眠问题
  const issues = identifySleepIssues(records, averageHours, averageQuality)
  
  return {
    averageHours: parseFloat(averageHours.toFixed(1)),
    averageQuality: parseFloat(averageQuality.toFixed(1)),
    consistency,
    bedtimeRegularity,
    wakeupRegularity,
    issues,
    recordCount: records.length
  }
}

// 分析时间规律性
function analyzeTimeRegularity(records, timeField) {
  if (records.length < 2) return 0
  
  // 计算时间标准差（简化版）
  const times = records
    .filter(record => record[timeField])
    .map(record => {
      const [hours, minutes] = record[timeField].split(':').map(Number)
      return hours * 60 + minutes // 转换为分钟数
    })
  
  if (times.length < 2) return 0
  
  const mean = times.reduce((sum, time) => sum + time, 0) / times.length
  const variance = times.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) / times.length
  const stdDev = Math.sqrt(variance)
  
  // 标准差越小，规律性越高（最高100分）
  const regularity = Math.max(0, 100 - (stdDev / 10))
  return Math.round(regularity)
}

// 分析一致性
function analyzeConsistency(records) {
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
  
  // 连续天数占总天数的比例
  const consistency = (continuousDays / records.length) * 100
  return Math.min(100, Math.round(consistency))
}

// 识别睡眠问题
function identifySleepIssues(records, averageHours, averageQuality) {
  const issues = []
  
  // 检查睡眠时长问题
  if (averageHours < 7) {
    issues.push({
      type: 'insufficient_sleep',
      severity: averageHours < 6 ? 'high' : 'medium',
      description: '睡眠时长不足'
    })
  } else if (averageHours > 9) {
    issues.push({
      type: 'excessive_sleep',
      severity: 'low',
      description: '睡眠时间偏长'
    })
  }
  
  // 检查睡眠质量问题
  if (averageQuality < 3) {
    issues.push({
      type: 'poor_quality',
      severity: averageQuality < 2.5 ? 'high' : 'medium',
      description: '睡眠质量较差'
    })
  }
  
  // 检查就寝时间不规律
  const bedtimeRegularity = analyzeTimeRegularity(records, 'sleepTime')
  if (bedtimeRegularity < 70) {
    issues.push({
      type: 'irregular_bedtime',
      severity: bedtimeRegularity < 50 ? 'high' : 'medium',
      description: '就寝时间不规律'
    })
  }
  
  // 检查起床时间不规律
  const wakeupRegularity = analyzeTimeRegularity(records, 'wakeupTime')
  if (wakeupRegularity < 70) {
    issues.push({
      type: 'irregular_wakeup',
      severity: wakeupRegularity < 50 ? 'high' : 'medium',
      description: '起床时间不规律'
    })
  }
  
  // 检查周末补偿睡眠（如果数据包含周末）
  const weekendRecords = records.filter(record => {
    const date = new Date(record.date)
    const day = date.getDay() // 0=周日, 6=周六
    return day === 0 || day === 6
  })
  
  const weekdayRecords = records.filter(record => {
    const date = new Date(record.date)
    const day = date.getDay()
    return day >= 1 && day <= 5
  })
  
  if (weekendRecords.length > 0 && weekdayRecords.length > 0) {
    const weekendAvg = weekendRecords.reduce((sum, r) => sum + r.actualHours, 0) / weekendRecords.length
    const weekdayAvg = weekdayRecords.reduce((sum, r) => sum + r.actualHours, 0) / weekdayRecords.length
    
    if (weekendAvg - weekdayAvg > 1.5) {
      issues.push({
        type: 'weekend_compensation',
        severity: 'medium',
        description: '周末补偿睡眠'
      })
    }
  }
  
  return issues
}

// 生成个性化建议
function generatePersonalizedSuggestions(analysis) {
  const { averageHours, averageQuality, consistency, bedtimeRegularity, wakeupRegularity, issues } = analysis
  const suggestions = []
  
  // 基础建议
  suggestions.push(...generateBasicSuggestions(averageHours, averageQuality))
  
  // 规律性建议
  if (bedtimeRegularity < 80) {
    suggestions.push({
      category: '规律性',
      priority: bedtimeRegularity < 60 ? 'high' : 'medium',
      title: '固定就寝时间',
      content: `您的就寝时间规律性为${bedtimeRegularity}%，建议每天在相同时间上床睡觉，帮助身体建立生物钟。`,
      action: '设置固定的就寝时间提醒'
    })
  }
  
  if (wakeupRegularity < 80) {
    suggestions.push({
      category: '规律性',
      priority: wakeupRegularity < 60 ? 'high' : 'medium',
      title: '固定起床时间',
      content: `您的起床时间规律性为${wakeupRegularity}%，建议每天在相同时间起床，包括周末。`,
      action: '设置规律的起床闹钟'
    })
  }
  
  // 一致性建议
  if (consistency < 80) {
    suggestions.push({
      category: '习惯',
      priority: consistency < 60 ? 'medium' : 'low',
      title: '坚持记录',
      content: `您的睡眠记录连续性为${consistency}%，坚持每天记录睡眠数据有助于更好地了解自己的睡眠模式。`,
      action: '每天睡前记录睡眠计划'
    })
  }
  
  // 针对具体问题的建议
  issues.forEach(issue => {
    const suggestion = getIssueSpecificSuggestion(issue)
    if (suggestion) {
      suggestions.push(suggestion)
    }
  })
  
  // 健康习惯建议（通用）
  suggestions.push(...getHealthyHabitSuggestions())
  
  // 按优先级排序
  return suggestions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })
}

// 生成基础建议
function generateBasicSuggestions(averageHours, averageQuality) {
  const suggestions = []
  
  // 时长建议
  if (averageHours < 7) {
    suggestions.push({
      category: '时长',
      priority: averageHours < 6 ? 'high' : 'medium',
      title: '增加睡眠时间',
      content: `您的平均睡眠时长为${averageHours}小时，低于推荐的7-9小时。建议逐步增加睡眠时间。`,
      action: '每晚提前15分钟上床'
    })
  } else if (averageHours > 9) {
    suggestions.push({
      category: '时长',
      priority: 'low',
      title: '调整睡眠时长',
      content: `您的平均睡眠时长为${averageHours}小时，略高于推荐范围。如果白天感到困倦，可能需要调整。`,
      action: '保持7-9小时睡眠'
    })
  } else {
    suggestions.push({
      category: '时长',
      priority: 'low',
      title: '睡眠时长良好',
      content: `您的平均睡眠时长为${averageHours}小时，在健康范围内。`,
      action: '继续保持'
    })
  }
  
  // 质量建议
  if (averageQuality < 3) {
    suggestions.push({
      category: '质量',
      priority: averageQuality < 2.5 ? 'high' : 'medium',
      title: '改善睡眠质量',
      content: `您的睡眠质量评分为${averageQuality.toFixed(1)}/5，有待提高。`,
      action: '睡前1小时避免使用电子设备'
    })
  } else if (averageQuality >= 4) {
    suggestions.push({
      category: '质量',
      priority: 'low',
      title: '睡眠质量优秀',
      content: `您的睡眠质量评分为${averageQuality.toFixed(1)}/5，非常好！`,
      action: '继续保持良好习惯'
    })
  } else {
    suggestions.push({
      category: '质量',
      priority: 'low',
      title: '睡眠质量良好',
      content: `您的睡眠质量评分为${averageQuality.toFixed(1)}/5，仍有提升空间。`,
      action: '尝试放松技巧如冥想'
    })
  }
  
  return suggestions
}

// 获取问题特定建议
function getIssueSpecificSuggestion(issue) {
  const suggestionsMap = {
    insufficient_sleep: {
      category: '时长',
      priority: issue.severity === 'high' ? 'high' : 'medium',
      title: '解决睡眠不足',
      content: '长期睡眠不足会影响健康和工作效率。',
      action: '制定睡眠计划，确保每晚7-9小时睡眠'
    },
    excessive_sleep: {
      category: '时长',
      priority: 'low',
      title: '避免过度睡眠',
      content: '过度睡眠可能导致白天困倦和精力不足。',
      action: '设定起床闹钟，避免睡懒觉'
    },
    poor_quality: {
      category: '质量',
      priority: issue.severity === 'high' ? 'high' : 'medium',
      title: '提升睡眠质量',
      content: '睡眠质量差会影响身体恢复和心理健康。',
      action: '改善睡眠环境，保持卧室安静黑暗'
    },
    irregular_bedtime: {
      category: '规律性',
      priority: issue.severity === 'high' ? 'high' : 'medium',
      title: '规律就寝时间',
      content: '不规律的就寝时间会扰乱生物钟。',
      action: '设置就寝提醒，建立睡前仪式'
    },
    irregular_wakeup: {
      category: '规律性',
      priority: issue.severity === 'high' ? 'high' : 'medium',
      title: '规律起床时间',
      content: '不规律的起床时间影响全天精力。',
      action: '每天固定时间起床，周末也不例外'
    },
    weekend_compensation: {
      category: '习惯',
      priority: 'medium',
      title: '平衡作息时间',
      content: '周末过度补觉可能导致周一困倦。',
      action: '尽量保持周末和平日相似的作息'
    }
  }
  
  return suggestionsMap[issue.type]
}

// 获取健康习惯建议
function getHealthyHabitSuggestions() {
  return [
    {
      category: '习惯',
      priority: 'low',
      title: '睡前放松',
      content: '睡前进行放松活动，如阅读、冥想或温水浴。',
      action: '建立睡前放松仪式'
    },
    {
      category: '环境',
      priority: 'low',
      title: '优化睡眠环境',
      content: '保持卧室安静、黑暗、凉爽，使用舒适的床垫和枕头。',
      action: '检查并改善卧室环境'
    },
    {
      category: '饮食',
      priority: 'low',
      title: '注意饮食影响',
      content: '避免睡前大量进食、饮酒或摄入咖啡因。',
      action: '睡前3小时避免进食'
    },
    {
      category: '运动',
      priority: 'low',
      title: '规律运动',
      content: '白天适量运动有助于改善睡眠，但避免睡前剧烈运动。',
      action: '每天保持30分钟中等强度运动'
    }
  ]
}

// 获取默认建议
function getDefaultSuggestions() {
  return [
    {
      category: '开始',
      priority: 'high',
      title: '开始记录睡眠',
      content: '记录您的睡眠数据，获取个性化建议。',
      action: '今晚开始记录睡眠'
    },
    {
      category: '目标',
      priority: 'medium',
      title: '设定睡眠目标',
      content: '设定合理的睡眠目标，如每晚7-9小时睡眠。',
      action: '设置睡眠目标'
    },
    ...getHealthyHabitSuggestions()
  ]
}
