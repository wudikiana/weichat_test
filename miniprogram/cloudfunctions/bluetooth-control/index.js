// 蓝牙设备控制云函数
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

/**
 * 蓝牙设备控制云函数
 * 支持设备连接、挡位设置、设备状态查询等功能
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { action, deviceId, data } = event

  // 记录操作日志
  const logOperation = (operation, details) => {
    db.collection('bluetooth_logs').add({
      data: {
        openid,
        deviceId,
        operation,
        details,
        createTime: db.serverDate()
      }
    }).catch(console.error)
  }

  try {
    switch (action) {
      // 保存设备信息
      case 'saveDevice': {
        const { name, powerLevel, battery, isConnected } = data
        
        // 查询是否已存在
        const existRes = await db.collection('bluetooth_devices').where({
          openid,
          deviceId
        }).get()

        if (existRes.data && existRes.data.length > 0) {
          // 更新设备
          await db.collection('bluetooth_devices').doc(existRes.data[0]._id).update({
            data: {
              name,
              powerLevel: powerLevel || 5,
              battery: battery || 100,
              connected: isConnected,
              lastConnectTime: isConnected ? db.serverDate() : undefined,
              updateTime: db.serverDate()
            }
          })
          logOperation('update', { powerLevel, battery, isConnected })
          return { success: true, message: '设备已更新', deviceId }
        } else {
          // 新建设备
          await db.collection('bluetooth_devices').add({
            data: {
              openid,
              deviceId,
              name,
              powerLevel: powerLevel || 5,
              battery: battery || 100,
              connected: isConnected,
              createTime: db.serverDate(),
              updateTime: db.serverDate()
            }
          })
          logOperation('add', { name, powerLevel, battery })
          return { success: true, message: '设备已添加', deviceId }
        }
      }

      // 设置挡位
      case 'setPowerLevel': {
        const { level, deviceId: targetDeviceId } = data
        
        if (!targetDeviceId) {
          return { success: false, message: '设备ID不能为空' }
        }

        if (level < 1 || level > 10) {
          return { success: false, message: '挡位必须在1-10之间' }
        }

        // 查询设备
        const deviceRes = await db.collection('bluetooth_devices').where({
          openid,
          deviceId: targetDeviceId
        }).get()

        if (deviceRes.data && deviceRes.data.length > 0) {
          // 更新挡位
          await db.collection('bluetooth_devices').doc(deviceRes.data[0]._id).update({
            data: {
              powerLevel: level,
              updateTime: db.serverDate()
            }
          })

          // 记录挡位变更历史
          await db.collection('bluetooth_power_history').add({
            data: {
              openid,
              deviceId: targetDeviceId,
              previousLevel: deviceRes.data[0].powerLevel,
              currentLevel: level,
              createTime: db.serverDate()
            }
          })

          logOperation('setPowerLevel', { level, deviceId: targetDeviceId })
          return { 
            success: true, 
            message: `挡位已设置为${level}挡`,
            level,
            deviceId: targetDeviceId
          }
        } else {
          return { success: false, message: '设备不存在' }
        }
      }

      // 获取设备列表
      case 'getDevices': {
        const devicesRes = await db.collection('bluetooth_devices').where({
          openid
        }).orderBy('lastConnectTime', 'desc').get()

        return {
          success: true,
          devices: devicesRes.data || []
        }
      }

      // 获取单个设备详情
      case 'getDevice': {
        if (!deviceId) {
          return { success: false, message: '设备ID不能为空' }
        }

        const deviceRes = await db.collection('bluetooth_devices').where({
          openid,
          deviceId
        }).get()

        if (deviceRes.data && deviceRes.data.length > 0) {
          // 获取挡位历史
          const historyRes = await db.collection('bluetooth_power_history').where({
            openid,
            deviceId
          }).orderBy('createTime', 'desc').limit(20).get()

          return {
            success: true,
            device: deviceRes.data[0],
            powerHistory: historyRes.data || []
          }
        } else {
          return { success: false, message: '设备不存在' }
        }
      }

      // 断开设备连接
      case 'disconnect': {
        if (!deviceId) {
          return { success: false, message: '设备ID不能为空' }
        }

        const deviceRes = await db.collection('bluetooth_devices').where({
          openid,
          deviceId
        }).get()

        if (deviceRes.data && deviceRes.data.length > 0) {
          await db.collection('bluetooth_devices').doc(deviceRes.data[0]._id).update({
            data: {
              connected: false,
              updateTime: db.serverDate()
            }
          })

          logOperation('disconnect', { deviceId })
          return { success: true, message: '已断开连接' }
        } else {
          return { success: false, message: '设备不存在' }
        }
      }

      // 删除设备
      case 'deleteDevice': {
        if (!deviceId) {
          return { success: false, message: '设备ID不能为空' }
        }

        const deviceRes = await db.collection('bluetooth_devices').where({
          openid,
          deviceId
        }).get()

        if (deviceRes.data && deviceRes.data.length > 0) {
          await db.collection('bluetooth_devices').doc(deviceRes.data[0]._id).remove()
          
          logOperation('delete', { deviceId })
          return { success: true, message: '设备已删除' }
        } else {
          return { success: false, message: '设备不存在' }
        }
      }

      // 获取挡位历史
      case 'getPowerHistory': {
        const { limit = 20 } = data || {}
        
        const historyRes = await db.collection('bluetooth_power_history').where({
          openid,
          deviceId: deviceId || db.command.exists(true)
        }).orderBy('createTime', 'desc').limit(Number(limit)).get()

        return {
          success: true,
          history: historyRes.data || []
        }
      }

      // 获取设备统计数据
      case 'getDeviceStats': {
        const statsRes = await db.collection('bluetooth_devices').where({
          openid
        }).get()

        const totalDevices = statsRes.data?.length || 0
        const connectedCount = statsRes.data?.filter((d) => d.connected).length || 0
        
        // 计算平均挡位使用
        const powerLevels = statsRes.data?.map((d) => d.powerLevel).filter(Boolean) || []
        const avgPower = powerLevels.length > 0 
          ? (powerLevels.reduce((a, b) => a + b, 0) / powerLevels.length).toFixed(1)
          : 0

        return {
          success: true,
          stats: {
            totalDevices,
            connectedCount,
            avgPowerLevel: avgPower
          }
        }
      }

      default:
        return { success: false, message: '未知操作' }
    }
  } catch (error) {
    console.error('蓝牙云函数执行失败:', error)
    return {
      success: false,
      message: error.message || '操作失败'
    }
  }
}

