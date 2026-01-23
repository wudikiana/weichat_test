// bluetooth.ts
Page({
  data: {
    connectedDevices: [
      {
        id: '1',
        name: '智能助听器 Pro',
        battery: 85,
        connected: true
      }
    ],
    nearbyDevices: [
      {
        id: '2',
        name: 'EarHealth Device-001',
        signal: '强'
      },
      {
        id: '3',
        name: 'Smart Earphone-202',
        signal: '中'
      }
    ],
    historyDevices: [
      {
        id: '1',
        name: '智能助听器 Pro',
        lastConnectTime: '2024-01-15 14:30'
      },
      {
        id: '2',
        name: 'EarHealth Device-001',
        lastConnectTime: '2024-01-10 09:15'
      }
    ]
  },

  onLoad() {
    this.loadDevices();
  },

  loadDevices() {
    const devices = wx.getStorageSync('bluetoothDevices') || [];
    const connected = devices.filter((d: any) => d.connected);
    const nearby = devices.filter((d: any) => !d.connected);
    this.setData({
      connectedDevices: connected.length > 0 ? connected : this.data.connectedDevices,
      nearbyDevices: nearby.length > 0 ? nearby : this.data.nearbyDevices
    });
  },

  scanDevices() {
    wx.showLoading({ title: '扫描中...' });
    // 模拟扫描
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '扫描完成',
        icon: 'success'
      });
    }, 2000);
  },

  connectDevice(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showLoading({ title: '连接中...' });
    // 模拟连接
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '连接成功',
        icon: 'success'
      });
      this.loadDevices();
    }, 1500);
  },

  disconnectDevice(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认断开',
      content: '确定要断开连接吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已断开',
            icon: 'success'
          });
          this.loadDevices();
        }
      }
    });
  },

  viewDeviceDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '查看设备详情',
      icon: 'none'
    });
  }
});

