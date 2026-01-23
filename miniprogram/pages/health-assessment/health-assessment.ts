// health-assessment.ts
Page({
  data: {
    latestResult: {
      date: '2024年1月15日',
      score: 85,
      details: [
        { name: '听力状况', score: 90, color: '#00A870' },
        { name: '睡眠质量', score: 82, color: '#0052D9' },
        { name: '设备使用', score: 88, color: '#8B5CF6' }
      ],
      suggestion: '您的整体健康状况良好，建议继续保持规律的作息时间，定期进行健康评测以跟踪健康状况变化。'
    },
    history: [
      { id: '1', date: '2024年1月15日', score: 85, status: '良好' },
      { id: '2', date: '2024年1月1日', score: 78, status: '一般' },
      { id: '3', date: '2023年12月15日', score: 80, status: '良好' }
    ],
    trendData: [
      { date: '12月', height: 60, isLatest: false },
      { date: '1月1', height: 65, isLatest: false },
      { date: '1月15', height: 85, isLatest: true }
    ]
  },

  onLoad() {
    this.loadAssessmentData();
  },

  loadAssessmentData() {
    const latestResult = wx.getStorageSync('latestAssessment') || this.data.latestResult;
    const history = wx.getStorageSync('assessmentHistory') || this.data.history;
    this.setData({ latestResult, history });
  },

  startAssessment() {
    wx.showToast({
      title: '开始评测',
      icon: 'none'
    });
    // 跳转到评测问卷页面
  },

  viewHistory(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '查看历史详情',
      icon: 'none'
    });
  }
});

