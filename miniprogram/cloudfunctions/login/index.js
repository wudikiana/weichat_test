// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * 获取用户openid
 * @param {object} event - 传入参数
 * @param {object} context - 上下文
 * @returns {object} 包含openid的对象
 */
exports.main = async (event, context) => {
  // 获取微信上下文
  const wxContext = cloud.getWXContext()

  return {
    // 用户唯一标识
    openid: wxContext.OPENID,
    // 小程序AppID
    appid: wxContext.APPID,
    // 用户UnionID（需用户已授权）
    unionid: wxContext.UNIONID,
    // 环境ID
    env: wxContext.ENV
  }
}

