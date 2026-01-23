// ear-scan.ts
Page({
  data: {
    scanHistory: [
      {
        id: '1',
        date: '2024年1月15日',
        result: '正常',
        status: '正常'
      },
      {
        id: '2',
        date: '2024年1月10日',
        result: '需关注',
        status: '需关注'
      }
    ]
  },

  onLoad() {
    this.loadScanHistory();
  },

  loadScanHistory() {
    const history = wx.getStorageSync('scanHistory') || this.data.scanHistory;
    this.setData({ scanHistory: history });
  },

  chooseFromAlbum() {
    wx.chooseImage({
      count: 2,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        this.uploadAndAnalyze(res.tempFilePaths);
      }
    });
  },

  takePhoto() {
    wx.chooseImage({
      count: 2,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        this.uploadAndAnalyze(res.tempFilePaths);
      }
    });
  },

  uploadAndAnalyze(imagePaths: string[]) {
    wx.showLoading({ title: '分析中...' });
    // 模拟上传和分析
    setTimeout(() => {
      wx.hideLoading();
      wx.navigateTo({
        url: '/pages/ear-scan-result/ear-scan-result'
      });
    }, 2000);
  },

  viewResult(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/ear-scan-result/ear-scan-result?id=${id}`
    });
  }
});

