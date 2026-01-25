// 健康测评云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 健康测评云函数
 * 支持SAS/SDS测评结果保存、查询、统计分析等功能
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  // 记录操作日志
  const logOperation = (operation: string, details: any) => {
    db.collection('health_assessment_logs').add({
      data: {
        openid,
        operation,
        details,
        createTime: db.serverDate()
      }
    }).catch(console.error)
  }

  try {
    switch (action) {
      // 保存测评结果
      case 'saveAssessment': {
        const { sasScore, sdsScore, status, suggestion, date, answers } = data

        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        const totalScore = sasScore + sdsScore

        // 计算结果状态和建议（如果未提供）
        let finalStatus = status
        let finalSuggestion = suggestion

        if (!finalStatus) {
          // 综合判断
          if (sasScore < 50 && sdsScore < 53) {
            finalStatus = '心理健康'
            finalSuggestion = '您的心理状态良好，焦虑和抑郁水平都在正常范围内。建议继续保持良好的生活习惯，保持积极乐观的心态，适当运动，保持社交活动。'
          } else if (sasScore < 60 && sdsScore < 63) {
            finalStatus = '轻度情绪困扰'
            finalSuggestion = '您存在轻度的焦虑或抑郁情绪。建议适当放松，保持规律作息，可以尝试深呼吸、冥想等放松方法。多与朋友交流，适当运动。'
          } else if (sasScore < 70 && sdsScore < 73) {
            finalStatus = '中度情绪困扰'
            finalSuggestion = '您存在中度的焦虑或抑郁情绪。建议咨询心理医生进行专业评估和指导。同时可以尝试认知行为疗法等心理干预方法。'
          } else {
            finalStatus = '重度情绪困扰'
            finalSuggestion = '您存在较严重的焦虑或抑郁情绪，建议尽快就医，接受专业心理治疗或医学干预。不要独自承受，及时寻求帮助。'
          }
        }

        // 保存测评结果
        const addRes = await db.collection('health_assessments').add({
          data: {
            openid,
            sasScore,
            sdsScore,
            totalScore,
            status: finalStatus,
            suggestion: finalSuggestion,
            date: date || new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\//g, '-'),
            answers: answers || null, // 保存答题详情（可选）
            createTime: db.serverDate()
          }
        })

        logOperation('save', { sasScore, sdsScore, totalScore, status: finalStatus })

        return {
          success: true,
          message: '测评结果已保存',
          assessmentId: addRes.id,
          data: {
            sasScore,
            sdsScore,
            totalScore,
            status: finalStatus,
            suggestion: finalSuggestion
          }
        }
      }

      // 获取测评历史
      case 'getHistory': {
        const { limit = 10, page = 1 } = data || {}
        const skip = (page - 1) * limit

        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        const countRes = await db.collection('health_assessments').where({
          openid
        }).count()

        const historyRes = await db.collection('health_assessments').where({
          openid
        }).orderBy('createTime', 'desc').skip(skip).limit(Number(limit)).get()

        return {
          success: true,
          history: historyRes.data || [],
          total: countRes.total,
          page,
          limit
        }
      }

      // 获取单次测评详情
      case 'getDetail': {
        const { assessmentId } = data

        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        if (!assessmentId) {
          return { success: false, message: '测评ID不能为空' }
        }

        const detailRes = await db.collection('health_assessments').where({
          openid,
          _id: assessmentId
        }).get()

        if (detailRes.data && detailRes.data.length > 0) {
          return {
            success: true,
            assessment: detailRes.data[0]
          }
        } else {
          return { success: false, message: '测评记录不存在' }
        }
      }

      // 获取最新测评结果
      case 'getLatest': {
        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        const latestRes = await db.collection('health_assessments').where({
          openid
        }).orderBy('createTime', 'desc').limit(1).get()

        if (latestRes.data && latestRes.data.length > 0) {
          return {
            success: true,
            assessment: latestRes.data[0]
          }
        } else {
          return { success: false, message: '暂无测评记录' }
        }
      }

      // 获取统计信息
      case 'getStats': {
        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        const statsRes = await db.collection('health_assessments').where({
          openid
        }).get()

        const assessments = statsRes.data || []
        const totalCount = assessments.length

        if (totalCount === 0) {
          return {
            success: true,
            stats: {
              totalCount: 0,
              avgSasScore: 0,
              avgSdsScore: 0,
              avgTotalScore: 0,
              latestStatus: '暂无数据'
            }
          }
        }

        // 计算平均分
        const totalSas = assessments.reduce((sum: number, a: any) => sum + (a.sasScore || 0), 0)
        const totalSds = assessments.reduce((sum: number, a: any) => sum + (a.sdsScore || 0), 0)
        const avgSas = (totalSas / totalCount).toFixed(1)
        const avgSds = (totalSds / totalCount).toFixed(1)
        const avgTotal = ((parseFloat(avgSas) + parseFloat(avgSds)) / 2).toFixed(1)

        // 获取最新状态
        const latestAssessment = assessments.sort((a: any, b: any) => 
          new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
        )[0]

        return {
          success: true,
          stats: {
            totalCount,
            avgSasScore: avgSas,
            avgSdsScore: avgSds,
            avgTotalScore: avgTotal,
            latestStatus: latestAssessment?.status || '暂无数据'
          }
        }
      }

      // 删除测评记录
      case 'deleteAssessment': {
        const { assessmentId } = data

        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        if (!assessmentId) {
          return { success: false, message: '测评ID不能为空' }
        }

        // 检查记录是否存在且属于当前用户
        const existRes = await db.collection('health_assessments').where({
          openid,
          _id: assessmentId
        }).get()

        if (existRes.data && existRes.data.length > 0) {
          await db.collection('health_assessments').doc(assessmentId).remove()
          
          logOperation('delete', { assessmentId })
          
          return {
            success: true,
            message: '测评记录已删除'
          }
        } else {
          return { success: false, message: '记录不存在或无权删除' }
        }
      }

      // 获取趋势分析
      case 'getTrend': {
        const { days = 30 } = data || {}

        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        const startTime = new Date()
        startTime.setDate(startTime.getDate() - days)

        const trendRes = await db.collection('health_assessments').where({
          openid,
          createTime: db.command.gt(startTime)
        }).orderBy('createTime', 'asc').get()

        // 按日期分组统计
        const dailyStats: Record<string, { sas: number[], sds: number[], count: number }> = {}
        
        (trendRes.data || []).forEach((item: any) => {
          const date = item.date || new Date(item.createTime).toLocaleDateString()
          if (!dailyStats[date]) {
            dailyStats[date] = { sas: [], sds: [], count: 0 }
          }
          dailyStats[date].sas.push(item.sasScore || 0)
          dailyStats[date].sds.push(item.sdsScore || 0)
          dailyStats[date].count++
        })

        const trend = Object.entries(dailyStats).map(([date, stats]) => ({
          date,
          avgSasScore: (stats.sas.reduce((a, b) => a + b, 0) / stats.count).toFixed(1),
          avgSdsScore: (stats.sds.reduce((a, b) => a + b, 0) / stats.count).toFixed(1),
          count: stats.count
        }))

        return {
          success: true,
          trend,
          days
        }
      }

      // SAS专项分析
      case 'analyzeSAS': {
        const { assessmentId } = data

        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        let assessment: any

        if (assessmentId) {
          const detailRes = await db.collection('health_assessments').where({
            openid,
            _id: assessmentId
          }).get()
          assessment = detailRes.data?.[0]
        } else {
          const latestRes = await db.collection('health_assessments').where({
            openid
          }).orderBy('createTime', 'desc').limit(1).get()
          assessment = latestRes.data?.[0]
        }

        if (!assessment) {
          return { success: false, message: '暂无测评数据' }
        }

        // SAS评分标准分析
        let level = ''
        let description = ''
        const score = assessment.sasScore

        if (score < 50) {
          level = '正常'
          description = '焦虑水平处于正常范围。继续保持良好的生活习惯和心态。'
        } else if (score < 55) {
          level = '边缘状态'
          description = '处于正常与轻度焦虑的边缘。建议关注自身情绪变化，适当放松。'
        } else if (score < 60) {
          level = '轻度焦虑'
          description = '存在轻度焦虑。建议适当放松，可以尝试深呼吸、冥想等方法。'
        } else if (score < 65) {
          level = '中度焦虑'
          description = '存在中度焦虑。建议咨询心理医生进行专业评估。'
        } else if (score < 70) {
          level = '较重焦虑'
          description = '焦虑症状较为明显。建议及时寻求专业心理帮助。'
        } else {
          level = '重度焦虑'
          description = '焦虑症状严重，建议尽快就医，接受专业治疗。'
        }

        return {
          success: true,
          analysis: {
            score,
            level,
            description,
            date: assessment.date,
            advice: `根据您的SAS测评结果，当前${level}。${description}`
          }
        }
      }

      // SDS专项分析
      case 'analyzeSDS': {
        const { assessmentId } = data

        if (!openid) {
          return { success: false, message: '用户未登录' }
        }

        let assessment: any

        if (assessmentId) {
          const detailRes = await db.collection('health_assessments').where({
            openid,
            _id: assessmentId
          }).get()
          assessment = detailRes.data?.[0]
        } else {
          const latestRes = await db.collection('health_assessments').where({
            openid
          }).orderBy('createTime', 'desc').limit(1).get()
          assessment = latestRes.data?.[0]
        }

        if (!assessment) {
          return { success: false, message: '暂无测评数据' }
        }

        // SDS评分标准分析
        let level = ''
        let description = ''
        const score = assessment.sdsScore

        if (score < 53) {
          level = '正常'
          description = '抑郁水平处于正常范围。继续保持积极乐观的心态。'
        } else if (score < 58) {
          level = '边缘状态'
          description = '处于正常与轻度抑郁的边缘。建议多与朋友交流，保持活动。'
        } else if (score < 63) {
          level = '轻度抑郁'
          description = '存在轻度抑郁情绪。建议多与朋友交流，适当运动。'
        } else if (score < 68) {
          level = '中度抑郁'
          description = '存在中度抑郁。建议咨询心理医生。'
        } else if (score < 73) {
          level = '较重抑郁'
          description = '抑郁症状较为明显。建议及时寻求专业帮助。'
        } else {
          level = '重度抑郁'
          description = '抑郁症状严重，建议尽快就医，接受专业治疗。'
        }

        return {
          success: true,
          analysis: {
            score,
            level,
            description,
            date: assessment.date,
            advice: `根据您的SDS测评结果，当前${level}。${description}`
          }
        }
      }

      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('健康测评云函数执行失败:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

