// feedback.ts
Page({
  data: {
    categories: [
      { id: 'suggestion', name: '功能建议' },
      { id: 'problem', name: '使用问题' },
      { id: 'content', name: '内容反馈' },
      { id: 'other', name: '其他' }
    ],
    selectedCategory: '',
    description: '',
    images: [],
    contact: '',
    myFeedbacks: [
      {
        id: '1',
        category: '功能建议',
        date: '2024-01-10 14:30',
        status: '处理中',
        content: '希望可以增加睡眠数据的导出功能，方便查看历史记录...'
      },
      {
        id: '2',
        category: '使用问题',
        date: '2024-01-05 09:15',
        status: '已处理',
        content: '蓝牙连接不稳定，经常断开连接...'
      }
    ]
  },

  onLoad() {
    this.loadMyFeedbacks();
  },

  loadMyFeedbacks() {
    const feedbacks = wx.getStorageSync('myFeedbacks') || this.data.myFeedbacks;
    this.setData({ myFeedbacks: feedbacks });
  },

  selectCategory(e: any) {
    this.setData({ selectedCategory: e.currentTarget.dataset.id });
  },

  onDescriptionChange(e: any) {
    this.setData({ description: e.detail.value });
  },

  onImageChange(e: any) {
    this.setData({ images: e.detail.files });
  },

  onContactChange(e: any) {
    this.setData({ contact: e.detail.value });
  },

  submitFeedback() {
    if (!this.data.selectedCategory) {
      wx.showToast({
        title: '请选择问题分类',
        icon: 'none'
      });
      return;
    }
    if (!this.data.description.trim()) {
      wx.showToast({
        title: '请输入问题描述',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    // 模拟提交
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '提交成功',
        icon: 'success'
      });
      // 重置表单
      this.setData({
        selectedCategory: '',
        description: '',
        images: [],
        contact: ''
      });
    }, 1500);
  }
});

