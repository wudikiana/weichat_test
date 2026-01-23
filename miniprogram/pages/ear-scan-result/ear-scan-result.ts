// ear-scan-result.ts
Page({
  data: {
    result: {
      time: '2024年1月15日 14:30',
      images: ['', ''],
      structures: [
        { name: '耳廓', status: '正常' },
        { name: '外耳道', status: '正常' },
        { name: '鼓膜', status: '正常' }
      ],
      abnormal: ''
    },
    suggestions: [
      '继续保持良好的耳部卫生习惯，定期清洁但避免过度清洁。',
      '避免长时间使用耳机，音量控制在安全范围内。',
      '建议每3-6个月进行一次耳部健康检查。',
      '如出现听力下降、耳鸣等症状，及时就医。'
    ],
    comparison: {
      lastTime: '2024年1月10日',
      lastStatus: '需关注',
      trend: '有所改善'
    }
  },

  onLoad(options: any) {
    if (options.id) {
      this.loadResult(options.id);
    }
  },

  loadResult(id: string) {
    // 从服务器或本地存储加载结果
  },

  saveRecord() {
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  shareToDoctor() {
    wx.showToast({
      title: '分享功能',
      icon: 'none'
    });
  },

  bookCheckup() {
    wx.navigateTo({
      url: '/pages/doctors/doctors'
    });
  }
});

