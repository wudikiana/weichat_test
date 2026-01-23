// sleep-statistics.ts
Page({
  data: {
    stats: {
      averageHours: '7.5',
      quality: 85,
      continuousDays: 5
    },
    weekData: [
      { day: '周一', height: 70, label: '周一' },
      { day: '周二', height: 85, label: '周二' },
      { day: '周三', height: 100, label: '周三' },
      { day: '周四', height: 75, label: '周四' },
      { day: '周五', height: 90, label: '周五' },
      { day: '周六', height: 60, label: '周六' },
      { day: '周日', height: 80, label: '周日' }
    ],
    qualityData: [
      { name: '深度睡眠', value: '2.5小时', percent: 33, color: '#0052D9' },
      { name: '浅度睡眠', value: '4.0小时', percent: 53, color: '#00A870' },
      { name: '快速眼动', value: '1.0小时', percent: 14, color: '#8B5CF6' }
    ],
    records: [
      {
        date: '2024年1月15日',
        status: '良好',
        timeRange: '22:30 - 06:30',
        duration: 8,
        deepSleep: '2.5h',
        lightSleep: '4.0h',
        remSleep: '1.0h'
      },
      {
        date: '2024年1月14日',
        status: '良好',
        timeRange: '23:00 - 07:00',
        duration: 8,
        deepSleep: '2.8h',
        lightSleep: '3.8h',
        remSleep: '1.2h'
      },
      {
        date: '2024年1月13日',
        status: '一般',
        timeRange: '00:30 - 07:30',
        duration: 7,
        deepSleep: '2.0h',
        lightSleep: '4.2h',
        remSleep: '0.8h'
      }
    ],
    suggestion: '您的睡眠质量整体良好，建议继续保持规律的作息时间。深度睡眠时间充足，有助于身体恢复和健康。'
  },

  onLoad() {
    this.loadStatistics();
  },

  loadStatistics() {
    const stats = wx.getStorageSync('sleepStats') || this.data.stats;
    const records = wx.getStorageSync('sleepRecords') || this.data.records;
    this.setData({ stats, records });
  }
});

