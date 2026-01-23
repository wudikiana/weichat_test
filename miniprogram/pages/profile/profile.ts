// profile.ts
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      age: 28,
      gender: '男'
    },
    healthData: {
      status: '良好',
      date: '2024年1月15日',
      score: 85
    },
    deviceCount: 1
  },

  onLoad() {
    this.getUserInfo();
    this.getHealthData();
    this.getDeviceCount();
  },

  onShow() {
    this.getUserInfo();
    this.getDeviceCount();
  },

  getUserInfo() {
    const userInfo = wx.getStorageSync('userInfo') || {
      nickName: '用户昵称',
      age: 28,
      gender: '男'
    };
    this.setData({ userInfo });
  },

  getHealthData() {
    const healthData = wx.getStorageSync('healthData') || this.data.healthData;
    this.setData({ healthData });
  },

  getDeviceCount() {
    const devices = wx.getStorageSync('bluetoothDevices') || [];
    const connectedCount = devices.filter((d: any) => d.connected).length;
    this.setData({ deviceCount: connectedCount });
  },

  navigateToEdit() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit'
    });
  },

  navigateToBluetooth() {
    wx.navigateTo({
      url: '/pages/bluetooth/bluetooth'
    });
  },

  navigateToHealthAssessment() {
    wx.navigateTo({
      url: '/pages/health-assessment/health-assessment'
    });
  },

  navigateToFeedback() {
    wx.navigateTo({
      url: '/pages/feedback/feedback'
    });
  }
});

