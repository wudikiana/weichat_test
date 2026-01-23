// sleep-plan.ts
Page({
  data: {
    sleepTarget: {
      hours: 8,
      bedtime: '22:30',
      wakeTime: '06:30',
      remainingTime: '6小时30分'
    },
    alarmCount: 3,
    weekData: [
      { day: '周一', height: 70, label: '周一', isToday: false },
      { day: '周二', height: 85, label: '周二', isToday: false },
      { day: '周三', height: 100, label: '周三', isToday: true },
      { day: '周四', height: 75, label: '周四', isToday: false },
      { day: '周五', height: 90, label: '周五', isToday: false },
      { day: '周六', height: 60, label: '周六', isToday: false },
      { day: '周日', height: 80, label: '周日', isToday: false }
    ],
    averageSleep: '7.5',
    sleepQuality: '良好',
    suggestion: '根据您的睡眠数据，建议保持规律的作息时间，睡前1小时避免使用电子设备，有助于提高睡眠质量。'
  },

  onLoad() {
    this.loadSleepData();
  },

  onShow() {
    this.loadSleepData();
  },

  loadSleepData() {
    const sleepTarget = wx.getStorageSync('sleepTarget') || this.data.sleepTarget;
    const alarmCount = wx.getStorageSync('alarmCount') || this.data.alarmCount;
    this.setData({ sleepTarget, alarmCount });
  },

  navigateToAlarm() {
    wx.navigateTo({
      url: '/pages/alarm/alarm'
    });
  },

  navigateToStatistics() {
    wx.navigateTo({
      url: '/pages/sleep-statistics/sleep-statistics'
    });
  }
});

