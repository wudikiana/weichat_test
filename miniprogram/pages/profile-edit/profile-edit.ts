// profile-edit.ts
Page({
  data: {
    userInfo: {
      avatarUrl: '',
      nickName: '',
      age: 28,
      gender: '男',
      phone: ''
    }
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || this.data.userInfo;
    this.setData({ userInfo });
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 这里应该上传到服务器，暂时使用本地路径
        this.setData({
          'userInfo.avatarUrl': tempFilePath
        });
      }
    });
  },

  onNickNameChange(e: any) {
    this.setData({
      'userInfo.nickName': e.detail.value
    });
  },

  onAgeChange(e: any) {
    this.setData({
      'userInfo.age': parseInt(e.detail.value) || 0
    });
  },

  onGenderChange(e: any) {
    this.setData({
      'userInfo.gender': e.detail.value
    });
  },

  onPhoneChange(e: any) {
    this.setData({
      'userInfo.phone': e.detail.value
    });
  },

  saveUserInfo() {
    wx.setStorageSync('userInfo', this.data.userInfo);
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});

