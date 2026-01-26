// 睡眠数据备份云函数
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 主函数
exports.main = async (event, context) => {
  const { userId, action = 'export', format = 'json', startDate, endDate } = event
  
  try {
    // 验证参数
    if (!userId) {
      return {
        code: 400,
        message: '缺少用户ID参数',
        data: null
      }
    }
    
    switch (action) {
      case 'export':
        return await exportSleepData(userId, format, startDate, endDate)
      case 'summary':
        return await getDataSummary(userId, startDate, endDate)
      case 'cleanup':
        return await cleanupOldData(userId)
      default:
        return {
          code: 400,
          message: '不支持的操作类型',
          data: null
        }
    }
    
  } catch (error) {
    console.error('睡眠数据备份云函数错误:', error)
    return {
      code: 500,
      message: '服务器内部错误',
      data: null
    }
  }
}

// 导出睡眠数据
async function exportSleepData(userId, format, startDate, endDate) {
  // 获取日期范围
  const dateRange = getDateRange(startDate, endDate)
  
  // 并行获取所有相关数据
  const [targets, records, alarms] = await Promise.all([
    getSleepTargets(userId, dateRange.start, dateRange.end),
    getSleepRecords(userId, dateRange.start, dateRange.end),
    getSleepAlarms(userId)
  ])
  
  // 构建导出数据
  const exportData = {
    metadata: {
      userId: userId,
      exportTime: new Date().toISOString(),
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      counts: {
        targets: targets.length,
        records: records.length,
        alarms: alarms.length
      }
    },
    data: {
      sleepTargets: targets,
      sleepRecords: records,
      sleepAlarms: alarms
    }
  }
  
  // 根据格式处理数据
  let resultData
  switch (format) {
    case 'json':
      resultData = exportData
      break
    case 'csv':
      resultData = convertToCSV(exportData)
      break
    case 'text':
      resultData = convertToText(exportData)
      break
    default:
      resultData = exportData
  }
  
  return {
    code: 200,
    message: '导出成功',
    data: resultData,
    format: format,
    fileName: `sleep_data_${userId}_${new Date().toISOString().split('T')[0]}.${format}`
  }
}

// 获取数据摘要
async function getDataSummary(userId, startDate, endDate) {
  const dateRange = getDateRange(startDate, endDate)
  
  const [targets, records, alarms] = await Promise.all([
    getSleepTargets(userId, dateRange.start, dateRange.end),
    getSleepRecords(userId, dateRange.start, dateRange.end),
    getSleepAlarms(userId)
  ])
  
  // 计算统计数据
  const stats = calculateExportStats(records, targets, alarms)
  
  return {
    code: 200,
    message: '获取成功',
    data: {
      summary: stats,
      dateRange: {
        start: dateRange.start,
        end: dateRange.end
      },
      exportInfo: {
        canExport: records.length > 0 || targets.length > 0 || alarms.length > 0,
        estimatedSize: estimateDataSize(records, targets, alarms)
      }
    }
  }
}

// 清理旧数据
async function cleanupOldData(userId) {
  // 计算90天前的日期
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 90)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]
  
  try {
    // 删除90天前的睡眠记录
    const deleteResult = await db.collection('sleep_records')
      .where({
        userId: userId,
        date: db.command.lt(cutoffDateStr)
      })
      .remove()
    
    return {
      code: 200,
      message: '清理完成',
      data: {
        deletedCount: deleteResult.stats.removed,
        cutoffDate: cutoffDateStr,
        note: '已清理90天前的睡眠记录'
      }
    }
  } catch (error) {
    console.error('清理数据失败:', error)
    return {
      code: 500,
      message: '清理数据失败',
      data: null
    }
  }
}

// 获取日期范围
function getDateRange(startDate, endDate) {
  const now = new Date()
  let start, end
  
  if (startDate && endDate) {
    start = new Date(startDate)
    end = new Date(endDate)
  } else if (startDate) {
    start = new Date(startDate)
    end = new Date(now)
  } else if (endDate) {
    start = new Date(now)
    start.setDate(start.getDate() - 30) // 默认最近30天
    end = new Date(endDate)
  } else {
    // 默认最近30天
    end = new Date(now)
    start = new Date(now)
    start.setDate(start.getDate() - 30)
  }
  
  // 确保开始日期不晚于结束日期
  if (start > end) {
    [start, end] = [end, start]
  }
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  }
}

// 获取睡眠目标
async function getSleepTargets(userId, startDate, endDate) {
  const result = await db.collection('sleep_targets')
    .where({
      userId: userId,
      updatedAt: db.command.gte(new Date(startDate)).and(db.command.lte(new Date(endDate)))
    })
    .orderBy('updatedAt', 'desc')
    .get()
  
  return result.data
}

// 获取睡眠记录
async function getSleepRecords(userId, startDate, endDate) {
  const result = await db.collection('sleep_records')
    .where({
      userId: userId,
      date: db.command.gte(startDate).and(db.command.lte(endDate))
    })
    .orderBy('date', 'desc')
    .get()
  
  return result.data
}

// 获取睡眠闹钟
async function getSleepAlarms(userId) {
  const result = await db.collection('sleep_alarms')
    .where({
      userId: userId
    })
    .orderBy('updatedAt', 'desc')
    .get()
  
  return result.data
}

// 计算导出统计
function calculateExportStats(records, targets, alarms) {
  // 计算记录统计
  const recordStats = {
    total: records.length,
    byMonth: groupByMonth(records),
    averageHours: 0,
    averageQuality: 0
  }
  
  if (records.length > 0) {
    const totalHours = records.reduce((sum, record) => sum + record.actualHours, 0)
    const totalQuality = records.reduce((sum, record) => sum + (record.quality || 0), 0)
    recordStats.averageHours = parseFloat((totalHours / records.length).toFixed(1))
    recordStats.averageQuality = parseFloat((totalQuality / records.length).toFixed(1))
  }
  
  // 计算目标统计
  const targetStats = {
    total: targets.length,
    active: targets.filter(t => t.isActive).length,
    averageTargetHours: 0
  }
  
  if (targets.length > 0) {
    const totalTargetHours = targets.reduce((sum, target) => sum + target.targetHours, 0)
    targetStats.averageTargetHours = parseFloat((totalTargetHours / targets.length).toFixed(1))
  }
  
  // 计算闹钟统计
  const alarmStats = {
    total: alarms.length,
    active: alarms.filter(a => a.isActive).length,
    byTime: groupByTime(alarms)
  }
  
  return {
    records: recordStats,
    targets: targetStats,
    alarms: alarmStats,
    overall: {
      totalItems: records.length + targets.length + alarms.length,
      dateRange: getDateRangeFromData(records),
      lastUpdated: getLastUpdated(records, targets, alarms)
    }
  }
}

// 按月分组
function groupByMonth(records) {
  const groups = {}
  
  records.forEach(record => {
    const date = new Date(record.date)
    const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    
    if (!groups[monthKey]) {
      groups[monthKey] = {
        count: 0,
        totalHours: 0,
        averageQuality: 0
      }
    }
    
    groups[monthKey].count++
    groups[monthKey].totalHours += record.actualHours
    groups[monthKey].averageQuality += record.quality || 0
  })
  
  // 计算平均值
  Object.keys(groups).forEach(key => {
    const group = groups[key]
    group.averageHours = parseFloat((group.totalHours / group.count).toFixed(1))
    group.averageQuality = parseFloat((group.averageQuality / group.count).toFixed(1))
    delete group.totalHours
    delete group.averageQuality
  })
  
  return groups
}

// 按时间分组闹钟
function groupByTime(alarms) {
  const groups = {
    morning: { count: 0, alarms: [] }, // 05:00-09:00
    daytime: { count: 0, alarms: [] }, // 09:00-17:00
    evening: { count: 0, alarms: [] }, // 17:00-22:00
    night: { count: 0, alarms: [] }    // 22:00-05:00
  }
  
  alarms.forEach(alarm => {
    const [hours] = alarm.time.split(':').map(Number)
    let group
    
    if (hours >= 5 && hours < 9) {
      group = 'morning'
    } else if (hours >= 9 && hours < 17) {
      group = 'daytime'
    } else if (hours >= 17 && hours < 22) {
      group = 'evening'
    } else {
      group = 'night'
    }
    
    groups[group].count++
    groups[group].alarms.push(alarm.time)
  })
  
  return groups
}

// 从数据中获取日期范围
function getDateRangeFromData(records) {
  if (records.length === 0) {
    return { start: null, end: null }
  }
  
  const dates = records.map(r => new Date(r.date).getTime())
  const minDate = new Date(Math.min(...dates))
  const maxDate = new Date(Math.max(...dates))
  
  return {
    start: minDate.toISOString().split('T')[0],
    end: maxDate.toISOString().split('T')[0]
  }
}

// 获取最后更新时间
function getLastUpdated(records, targets, alarms) {
  const allItems = [...records, ...targets, ...alarms]
  if (allItems.length === 0) return null
  
  const timestamps = allItems
    .map(item => new Date(item.updatedAt || item.createdAt || Date.now()).getTime())
    .filter(time => !isNaN(time))
  
  if (timestamps.length === 0) return null
  
  const latestTimestamp = Math.max(...timestamps)
  return new Date(latestTimestamp).toISOString()
}

// 估算数据大小
function estimateDataSize(records, targets, alarms) {
  const totalItems = records.length + targets.length + alarms.length
  const avgSizePerItem = 500 // 字节，粗略估计
  
  const sizeBytes = totalItems * avgSizePerItem
  
  // 转换为更友好的格式
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  } else if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KB`
  } else {
    return `${(sizeBytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

// 转换为CSV格式
function convertToCSV(data) {
  // 简化实现，实际应用中可能需要更复杂的CSV转换
  const csvLines = []
  
  // 添加元数据
  csvLines.push('=== 睡眠数据导出 ===')
  csvLines.push(`用户ID: ${data.metadata.userId}`)
  csvLines.push(`导出时间: ${data.metadata.exportTime}`)
  csvLines.push(`日期范围: ${data.metadata.dateRange.start} 至 ${data.metadata.dateRange.end}`)
  csvLines.push('')
  
  // 睡眠记录
  if (data.data.sleepRecords.length > 0) {
    csvLines.push('=== 睡眠记录 ===')
    csvLines.push('日期,入睡时间,醒来时间,睡眠时长(小时),质量评分,备注')
    data.data.sleepRecords.forEach(record => {
      csvLines.push([
        record.date,
        record.sleepTime || '',
        record.wakeupTime || '',
        record.actualHours,
        record.quality || '',
        `"${(record.notes || '').replace(/"/g, '""')}"`
      ].join(','))
    })
    csvLines.push('')
  }
  
  // 睡眠目标
  if (data.data.sleepTargets.length > 0) {
    csvLines.push('=== 睡眠目标 ===')
    csvLines.push('目标时长(小时),就寝时间,起床时间,生效星期,是否激活,更新时间')
    data.data.sleepTargets.forEach(target => {
      csvLines.push([
        target.targetHours,
        target.bedtime,
        target.wakeTime,
        target.daysOfWeek?.join(';') || '',
        target.isActive,
        target.updatedAt
      ].join(','))
    })
    csvLines.push('')
  }
  
  // 睡眠闹钟
  if (data.data.sleepAlarms.length > 0) {
    csvLines.push('=== 睡眠闹钟 ===')
    csvLines.push('时间,标签,重复星期,是否激活,铃声,震动,更新时间')
    data.data.sleepAlarms.forEach(alarm => {
      csvLines.push([
        alarm.time,
        `"${alarm.label.replace(/"/g, '""')}"`,
        alarm.daysOfWeek?.join(';') || '',
        alarm.isActive,
        alarm.sound,
        alarm.vibrate,
        alarm.updatedAt
      ].join(','))
    })
  }
  
  return csvLines.join('\n')
}

// 转换为文本格式
function convertToText(data) {
  const textLines = []
  
  textLines.push('='.repeat(50))
  textLines.push('睡眠数据导出报告')
  textLines.push('='.repeat(50))
  textLines.push('')
  
  // 元数据
  textLines.push('【导出信息】')
  textLines.push(`用户ID: ${data.metadata.userId}`)
  textLines.push(`导出时间: ${data.metadata.exportTime}`)
  textLines.push(`日期范围: ${data.metadata.dateRange.start} 至 ${data.metadata.dateRange.end}`)
  textLines.push(`数据统计: ${data.metadata.counts.records}条记录, ${data.metadata.counts.targets}个目标, ${data.metadata.counts.alarms}个闹钟`)
  textLines.push('')
  
  // 睡眠记录摘要
  if (data.data.sleepRecords.length > 0) {
    textLines.push('【睡眠记录摘要】')
    const stats = calculateExportStats(data.data.sleepRecords, [], [])
    textLines.push(`总记录数: ${stats.records.total}`)
    textLines.push(`平均睡眠时长: ${stats.records.averageHours}小时`)
    textLines.push(`平均睡眠质量: ${stats.records.averageQuality}/5`)
    textLines.push('')
    
    // 最近5条记录
    textLines.push('最近5条记录:')
    data.data.sleepRecords.slice(0, 5).forEach((record, index) => {
      textLines.push(`${index + 1}. ${record.date}: ${record.sleepTime || '22:30'} - ${record.wakeupTime || '06:30'} (${record.actualHours}小时, 质量: ${record.quality || 'N/A'}/5)`)
    })
    textLines.push('')
  }
  
  // 睡眠目标摘要
  if (data.data.sleepTargets.length > 0) {
    textLines.push('【睡眠目标摘要】')
    const activeTarget = data.data.sleepTargets.find(t => t.isActive)
    if (activeTarget) {
      textLines.push(`当前目标: ${activeTarget.targetHours}小时 (${activeTarget.bedtime} - ${activeTarget.wakeTime})`)
    }
    textLines.push(`历史目标数: ${data.data.sleepTargets.length}`)
    textLines.push('')
  }
  
  // 睡眠闹钟摘要
  if (data.data.sleepAlarms.length > 0) {
    textLines.push('【睡眠闹钟摘要】')
    const activeAlarms = data.data.sleepAlarms.filter(a => a.isActive)
    textLines.push(`总闹钟数: ${data.data.sleepAlarms.length}`)
    textLines.push(`活跃闹钟: ${activeAlarms.length}`)
    
    if (activeAlarms.length > 0) {
      textLines.push('活跃闹钟列表:')
      activeAlarms.forEach((alarm, index) => {
        textLines.push(`${index + 1}. ${alarm.time} - ${alarm.label} (${formatDaysOfWeek(alarm.daysOfWeek)})`)
      })
    }
    textLines.push('')
  }
  
  textLines.push('='.repeat(50))
  textLines.push('导出完成')
  textLines.push('='.repeat(50))
  
  return textLines.join('\n')
}

// 格式化星期几
function formatDaysOfWeek(days) {
  if (!days || !Array.isArray(days)) return '无'
  
  const dayNames = ['日', '一', '二', '三', '四', '五', '六']
  const chineseDays = days.map(day => {
    if (day >= 0 && day <= 6) {
      return `周${dayNames[day]}`
    }
    return day.toString()
  })
  
  return chineseDays.join('、')
}
