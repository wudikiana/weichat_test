// health-consultation.ts
Page({
  data: {
    recommendedDoctors: [
      {
        id: '1',
        name: '张医生',
        title: '耳鼻喉科 · 主任医师',
        description: '擅长耳部疾病诊断与治疗，有20年临床经验...',
        rating: 4.9
      },
      {
        id: '2',
        name: '李医生',
        title: '耳科 · 副主任医师',
        description: '专注于听力障碍和助听器适配，经验丰富...',
        rating: 4.8
      }
    ]
  },

  onLoad() {
    this.loadRecommendedDoctors();
  },

  loadRecommendedDoctors() {
    // 从服务器或本地存储加载推荐医生
  },

  navigateToDoctors() {
    wx.navigateTo({
      url: '/pages/doctors/doctors'
    });
  },

  navigateToKnowledge() {
    wx.navigateTo({
      url: '/pages/knowledge/knowledge'
    });
  },

  startConsult() {
    wx.showToast({
      title: '正在连接客服...',
      icon: 'loading'
    });
  },

  viewDoctor(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/doctors/doctors?id=${id}`
    });
  },

  consultDoctor(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '正在连接医生...',
      icon: 'loading'
    });
  },

  bookDoctor(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '跳转预约页面',
      icon: 'none'
    });
  },

  stopPropagation() {
    // 阻止事件冒泡
  }
});

