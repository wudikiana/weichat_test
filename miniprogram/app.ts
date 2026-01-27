// app.ts
App<IAppOption>({
  globalData: {},
  onLaunch() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 初始化云开发
    this.initCloudBase()

    // 登录
    wx.login({
      success: res => {
        console.log(res.code)
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
      },
    })
  },

  // 初始化云开发
  initCloudBase() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    // 初始化云开发环境
    wx.cloud.init({
      env: 'cloudbase-9ghm3xfo6fefd1bb', // 用户提供的环境ID
      traceUser: true,
    })

    console.log('云开发初始化完成')
    
    // 启动闹钟触发服务
    this.startAlarmTriggerService()
  },

  // 启动闹钟触发服务
  startAlarmTriggerService() {
    try {
      // 使用require代替动态导入，避免小程序环境兼容性问题
      const alarmTriggerService = require('./utils/alarmTriggerService')
      alarmTriggerService.startAlarmTriggerService()
      console.log('闹钟触发服务已启动')
    } catch (error) {
      console.error('启动闹钟触发服务失败:', error)
    }
  },
})
