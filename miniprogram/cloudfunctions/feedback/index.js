// 反馈云函数 - 纯JavaScript
var cloud = require('wx-server-sdk')
cloud.init({
  env: 'cloudbase-9ghm3xfo6fefd1bb'
})

var db = cloud.database()

exports.main = function(event, context) {
  var wxContext = cloud.getWXContext()
  var openid = wxContext.OPENID
  var action = event.action || ''
  var data = event.data || {}

  console.log('action:', action, 'openid:', openid)

  // 提交反馈
  if (action === 'submit') {
    if (!openid) {
      return Promise.resolve({ success: false, message: '用户未登录' })
    }

    var category = data.category || ''
    var description = data.description || ''

    if (!category) {
      return Promise.resolve({ success: false, message: '请选择问题分类' })
    }

    if (!description || description.length < 10) {
      return Promise.resolve({ success: false, message: '请至少输入10个字符' })
    }

    var categoryMap = {
      'suggestion': '功能建议',
      'problem': '使用问题',
      'content': '内容反馈',
      'other': '其他'
    }

    return db.collection('feedbacks').add({
      data: {
        openid: openid,
        category: category,
        categoryName: categoryMap[category] || category,
        description: description,
        images: data.images || [],
        contact: data.contact || '',
        status: '待处理',
        createTime: new Date()
      }
    }).then(function(res) {
      return { success: true, message: '提交成功', feedbackId: res.id }
    }).catch(function(err) {
      return { success: false, message: err.message || '提交失败' }
    })
  }

  // 获取列表
  if (action === 'getList') {
    if (!openid) {
      return Promise.resolve({ success: false, message: '用户未登录' })
    }

    var limit = data.limit || 20

    return db.collection('feedbacks')
      .where({ openid: openid })
      .orderBy('createTime', 'desc')
      .limit(limit)
      .get()
      .then(function(res) {
        return { success: true, list: res.data || [] }
      })
      .catch(function(err) {
        return { success: false, message: err.message || '获取失败' }
      })
  }

  // 获取统计
  if (action === 'getStats') {
    if (!openid) {
      return Promise.resolve({ success: false, message: '用户未登录' })
    }

    return db.collection('feedbacks')
      .where({ openid: openid })
      .get()
      .then(function(res) {
        var list = res.data || []
        var pending = 0
        var processed = 0

        for (var i = 0; i < list.length; i++) {
          if (list[i].status === '待处理') {
            pending++
          } else if (list[i].status === '已处理') {
            processed++
          }
        }

        return {
          success: true,
          stats: {
            total: list.length,
            pending: pending,
            processed: processed
          }
        }
      })
      .catch(function(err) {
        return { success: false, message: err.message || '获取失败' }
      })
  }

  // 删除反馈
  if (action === 'delete') {
    var feedbackId = data.feedbackId

    if (!feedbackId) {
      return Promise.resolve({ success: false, message: '反馈ID不能为空' })
    }

    return db.collection('feedbacks').doc(feedbackId).remove()
      .then(function() {
        return { success: true, message: '删除成功' }
      })
      .catch(function(err) {
        return { success: false, message: err.message || '删除失败' }
      })
  }

  return Promise.resolve({ success: false, message: '未知操作' })
}
