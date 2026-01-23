// doctors.ts
Page({
  data: {
    categories: [
      { id: 'all', name: '全部' },
      { id: 'ent', name: '耳鼻喉科' },
      { id: 'ear', name: '耳科' },
      { id: 'hearing', name: '听力科' }
    ],
    selectedCategory: 'all',
    doctors: [
      {
        id: '1',
        name: '张医生',
        hospital: '市第一医院',
        department: '耳鼻喉科',
        title: '主任医师',
        experience: 20,
        rating: 4.9,
        reviewCount: 128,
        description: '擅长耳部疾病诊断与治疗，听力障碍评估，助听器适配等。对耳部炎症、听力下降等疾病有丰富的诊疗经验。',
        bookable: true,
        online: true
      },
      {
        id: '2',
        name: '李医生',
        hospital: '市人民医院',
        department: '耳科',
        title: '副主任医师',
        experience: 15,
        rating: 4.8,
        reviewCount: 95,
        description: '专注于听力障碍和助听器适配，对儿童听力问题有深入研究。擅长各种耳部疾病的微创治疗。',
        bookable: true,
        online: true
      },
      {
        id: '3',
        name: '王医生',
        hospital: '市中医院',
        department: '耳鼻喉科',
        title: '主治医师',
        experience: 10,
        rating: 4.7,
        reviewCount: 76,
        description: '擅长中西医结合治疗耳部疾病，对耳鸣、耳聋等疾病有独特见解。注重患者体验，服务态度好。',
        bookable: true,
        online: false
      }
    ]
  },

  onLoad(options: any) {
    if (options.id) {
      // 查看特定医生详情
    }
    this.loadDoctors();
  },

  loadDoctors() {
    // 从服务器加载医生列表
  },

  selectCategory(e: any) {
    this.setData({ selectedCategory: e.currentTarget.dataset.id });
    // 根据分类筛选医生
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
  }
});

