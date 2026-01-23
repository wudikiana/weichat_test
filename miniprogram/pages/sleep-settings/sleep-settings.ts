// sleep-settings.ts
Page({
  data: {
    sleepTarget: {
      hours: 8,
      bedtime: '22:30',
      wakeTime: '06:30'
    },
    smartRecommend: true,
    reminders: {
      bedtime: true,
      wakeup: true
    }
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    const sleepTarget = wx.getStorageSync('sleepTarget') || this.data.sleepTarget;
    const smartRecommend = wx.getStorageSync('smartRecommend') !== false;
    const reminders = wx.getStorageSync('sleepReminders') || this.data.reminders;
    this.setData({ sleepTarget, smartRecommend, reminders });
  },

  decreaseHours() {
    if (this.data.sleepTarget.hours > 1) {
      this.setData({
        'sleepTarget.hours': this.data.sleepTarget.hours - 1
      });
    }
  },

  increaseHours() {
    if (this.data.sleepTarget.hours < 12) {
      this.setData({
        'sleepTarget.hours': this.data.sleepTarget.hours + 1
      });
    }
  },

  setBedtime() {
    wx.showToast({
      title: '选择就寝时间',
      icon: 'none'
    });
  },

  setWakeTime() {
    wx.showToast({
      title: '选择起床时间',
      icon: 'none'
    });
  },

  toggleSmartRecommend(e: any) {
    this.setData({ smartRecommend: e.detail.value });
  },

  toggleBedtimeReminder(e: any) {
    this.setData({
      'reminders.bedtime': e.detail.value
    });
  },

  toggleWakeupReminder(e: any) {
    this.setData({
      'reminders.wakeup': e.detail.value
    });
  },

  saveSettings() {
    wx.setStorageSync('sleepTarget', this.data.sleepTarget);
    wx.setStorageSync('smartRecommend', this.data.smartRecommend);
    wx.setStorageSync('sleepReminders', this.data.reminders);
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});

