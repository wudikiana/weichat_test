// device-location.ts
Page({
  data: {
    feedbacks: [
      { id: '1', text: '位置检测：正常' },
      { id: '2', text: '角度检测：正常' },
      { id: '3', text: '贴合度检测：正常' }
    ],
    soundEnabled: true,
    toneValue: 5,
    frequencyValue: 5,
    toneLabel: '中等',
    frequencyLabel: '中等',
    stats: {
      successRate: 95,
      successCount: 128,
      failCount: 7
    }
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    const settings = wx.getStorageSync('locationSettings') || {};
    this.setData({
      soundEnabled: settings.soundEnabled !== false,
      toneValue: settings.toneValue || 5,
      frequencyValue: settings.frequencyValue || 5
    });
    this.updateLabels();
  },

  toggleSound(e: any) {
    this.setData({ soundEnabled: e.detail.value });
    this.saveSettings();
  },

  onToneChange(e: any) {
    this.setData({ toneValue: e.detail.value });
    this.updateLabels();
    this.saveSettings();
  },

  onFrequencyChange(e: any) {
    this.setData({ frequencyValue: e.detail.value });
    this.updateLabels();
    this.saveSettings();
  },

  updateLabels() {
    const toneLabels = ['很低', '低', '较低', '中低', '中等', '中高', '较高', '高', '很高', '极高'];
    const frequencyLabels = ['很低', '低', '较低', '中低', '中等', '中高', '较高', '高', '很高', '极高'];
    this.setData({
      toneLabel: toneLabels[this.data.toneValue - 1] || '中等',
      frequencyLabel: frequencyLabels[this.data.frequencyValue - 1] || '中等'
    });
  },

  saveSettings() {
    wx.setStorageSync('locationSettings', {
      soundEnabled: this.data.soundEnabled,
      toneValue: this.data.toneValue,
      frequencyValue: this.data.frequencyValue
    });
  },

  startLocation() {
    wx.showLoading({ title: '检测中...' });
    // 模拟检测
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '检测完成',
        icon: 'success'
      });
    }, 2000);
  }
});

