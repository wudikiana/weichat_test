// 医生咨询云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 医生咨询云函数
 * 支持创建咨询会话、获取咨询记录、查询医生信息
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, data } = event

  try {
    switch (action) {
      // 创建咨询会话
      case 'createConsultation': {
        const { doctorId, doctorName, hospital, department } = data

        if (!doctorId) {
          return { success: false, message: '医生ID不能为空' }
        }

        // 创建咨询记录
        const consultationRes = await db.collection('consultations').add({
          data: {
            openid,
            doctorId,
            doctorName,
            hospital,
            department,
            status: 'pending', // pending-待回复, replying-咨询中, completed-已完成
            messageCount: 0,
            createTime: db.serverDate(),
            updateTime: db.serverDate()
          }
        })

        // 记录操作日志
        await db.collection('consultation_logs').add({
          data: {
            openid,
            consultationId: consultationRes._id,
            doctorId,
            action: 'create',
            createTime: db.serverDate()
          }
        })

        return {
          success: true,
          message: '咨询会话创建成功',
          consultationId: consultationRes._id,
          yuqueDocUrl: 'https://www.yuque.com/nicaisadasd/xnotpy/ec1x96iiw4g9m6i0?singleDoc'
        }
      }

      // 获取用户的咨询记录
      case 'getConsultations': {
        const consultationsRes = await db.collection('consultations')
          .where({ openid })
          .orderBy('createTime', 'desc')
          .limit(50)
          .get()

        return {
          success: true,
          consultations: consultationsRes.data || []
        }
      }

      // 获取单个咨询详情
      case 'getConsultationDetail': {
        const { consultationId } = data

        if (!consultationId) {
          return { success: false, message: '咨询ID不能为空' }
        }

        const consultationRes = await db.collection('consultations')
          .where({
            _id: consultationId,
            openid
          })
          .get()

        if (consultationRes.data && consultationRes.data.length > 0) {
          // 获取消息记录
          const messagesRes = await db.collection('consultation_messages')
            .where({ consultationId })
            .orderBy('createTime', 'asc')
            .limit(100)
            .get()

          return {
            success: true,
            consultation: consultationRes.data[0],
            messages: messagesRes.data || []
          }
        } else {
          return { success: false, message: '咨询记录不存在' }
        }
      }

      // 发送咨询消息
      case 'sendMessage': {
        const { consultationId, message, messageType = 'text' } = data

        if (!consultationId || !message) {
          return { success: false, message: '消息内容不能为空' }
        }

        // 验证咨询记录存在
        const consultationRes = await db.collection('consultations')
          .where({ _id: consultationId, openid })
          .get()

        if (!consultationRes.data || consultationRes.data.length === 0) {
          return { success: false, message: '咨询记录不存在' }
        }

        // 添加消息
        const messageRes = await db.collection('consultation_messages').add({
          data: {
            consultationId,
            openid,
            role: 'user', // user-用户, doctor-医生, system-系统
            messageType,
            content: message,
            createTime: db.serverDate()
          }
        })

        // 更新咨询记录
        await db.collection('consultations').doc(consultationId).update({
          data: {
            status: 'replying',
            messageCount: db.command.inc(1),
            updateTime: db.serverDate()
          }
        })

        return {
          success: true,
          message: '消息已发送',
          messageId: messageRes._id
        }
      }

      // 更新咨询状态
      case 'updateConsultationStatus': {
        const { consultationId, status } = data

        if (!consultationId || !status) {
          return { success: false, message: '参数不完整' }
        }

        await db.collection('consultations').doc(consultationId).update({
          data: {
            status,
            updateTime: db.serverDate()
          }
        })

        return { success: true, message: '状态已更新' }
      }

      // 获取咨询统计
      case 'getConsultationStats': {
        const statsRes = await db.collection('consultations')
          .where({ openid })
          .get()

        const consultations = statsRes.data || []
        
        return {
          success: true,
          stats: {
            totalCount: consultations.length,
            pendingCount: consultations.filter(c => c.status === 'pending').length,
            replyingCount: consultations.filter(c => c.status === 'replying').length,
            completedCount: consultations.filter(c => c.status === 'completed').length
          }
        }
      }

      // 获取语雀文档信息
      case 'getYuqueDocInfo': {
        return {
          success: true,
          docUrl: 'https://www.yuque.com/nicaisadasd/xnotpy/ec1x96iiw4g9m6i0?singleDoc',
          docTitle: '耳科健康咨询',
          description: '点击上方链接进行在线咨询，医生会尽快回复您的问题'
        }
      }

      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('咨询云函数执行失败:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

