// alarm.ts
Page({
  data: {
    alarms: [
      {
        id: '1',
        time: '06:30',
        repeat: '工作日',
        type: '轻柔唤醒',
        enabled: true,
        note: '工作日起床'
      },
      {
        id: '2',
        time: '07:00',
        repeat: '周末',
        type: '自然唤醒',
        enabled: true
      },
      {
        id: '3',
        time: '22:00',
        repeat: '每天',
        type: '就寝提醒',
        enabled: false
      }
    ]
  },

  onLoad() {
    this.loadAlarms();
  },

  loadAlarms() {
    const alarms = wx.getStorageSync('alarms') || this.data.alarms;
    this.setData({ alarms });
  },

  toggleAlarm(e: any) {
    const id = e.currentTarget.dataset.id;
    const alarms = this.data.alarms.map((alarm: any) => {
      if (alarm.id === id) {
        return { ...alarm, enabled: e.detail.value };
      }
      return alarm;
    });
    this.setData({ alarms });
    wx.setStorageSync('alarms', alarms);
  },

  addAlarm() {
    wx.showToast({
      title: '添加闹钟功能',
      icon: 'none'
    });
  },

  editAlarm(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({
      title: '编辑闹钟',
      icon: 'none'
    });
  },

  deleteAlarm(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个闹钟吗？',
      success: (res) => {
        if (res.confirm) {
          const alarms = this.data.alarms.filter((alarm: any) => alarm.id !== id);
          this.setData({ alarms });
          wx.setStorageSync('alarms', alarms);
          wx.showToast({
            title: '已删除',
            icon: 'success'
          });
        }
      }
    });
  }
});

