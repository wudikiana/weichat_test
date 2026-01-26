// device-location.ts - 设备定位功能
Page({
  data: {
    // 当前状态
    currentStep: 1, // 1: 佩戴前上传, 2: 标记位置, 3: 佩戴后上传, 4: 查看结果
    isLoading: false,
    
    // 图片相关
    preWearImage: '',
    postWearImage: '',
    referenceImage: '',
    markingPoints: [], // 标记点数组 [{x, y}, ...]
    isMarking: false,
    
    // 记录信息
    currentRecordId: '',
    locationHistory: [],
    
    // 分析结果
    analysisResult: null as any,
    score: 0,
    
    // 统计信息
    stats: {
      successRate: 0,
      successCount: 0,
      failCount: 0,
      totalTests: 0
    }
  },

  onLoad() {
    this.loadReferenceImage();
    this.loadLocationHistory();
    this.initCanvas();
  },

  onShow() {
    this.loadLocationHistory();
  },

  // 初始化canvas
  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#marking-canvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
          
          this.setData({
            canvas: canvas,
            ctx: ctx
          });
        }
      });
  },

  // 加载参考图片
  async loadReferenceImage() {
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'getReferenceImage'
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          referenceImage: result.result.data.imageUrl
        });
      }
    } catch (error) {
      console.error('加载参考图片失败:', error);
    }
  },

  // 加载定位历史
  async loadLocationHistory() {
    this.setData({ isLoading: true });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'getLocationHistory'
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          locationHistory: result.result.data.history
        });
        this.updateStats();
      }
    } catch (error) {
      console.error('加载定位历史失败:', error);
    } finally {
      this.setData({ isLoading: false });
    }
  },

  // 更新统计信息
  updateStats() {
    const history = this.data.locationHistory;
    const totalTests = history.length;
    const successCount = history.filter(item => item.score >= 80).length;
    const failCount = totalTests - successCount;
    const successRate = totalTests > 0 ? Math.round((successCount / totalTests) * 100) : 0;
    
    this.setData({
      stats: {
        successRate,
        successCount,
        failCount,
        totalTests
      }
    });
  },

  // 步骤1: 选择佩戴前图片
  choosePreWearImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadPreWearImage(res.tempFilePaths[0]);
      }
    });
  },

  // 上传佩戴前图片
  async uploadPreWearImage(imagePath: string) {
    wx.showLoading({ 
      title: '上传中...',
      mask: true
    });
    
    try {
      // 1. 上传图片到云存储
      const cloudPath = `device-location/temp_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath
      });
      
      // 2. 调用云函数保存记录
      const fileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'uploadPreWearImage',
          fileID: uploadResult.fileID,
          fileName: fileName,
          markingPoints: this.data.markingPoints
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          preWearImage: result.result.data.imageUrl,
          currentRecordId: result.result.data.recordId,
          currentStep: 2 // 进入标记步骤
        });
        
        // 显示图片用于标记
        setTimeout(() => {
          this.drawImageOnCanvas(result.result.data.imageUrl);
        }, 100);
      } else {
        wx.showToast({
          title: result.result.message || '上传失败',
          icon: 'error'
        });
      }
    } catch (error: any) {
      console.error('上传佩戴前图片失败:', error);
      wx.showToast({
        title: error.errMsg || '上传失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 在canvas上绘制图片
  drawImageOnCanvas(imageUrl: string) {
    const { canvas, ctx } = this.data;
    if (!canvas || !ctx) return;
    
    const img = canvas.createImage();
    img.src = imageUrl;
    img.onload = () => {
      // 清除canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 计算缩放比例
      const scale = Math.min(
        canvas.width / img.width,
        canvas.height / img.height
      );
      const width = img.width * scale;
      const height = img.height * scale;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;
      
      // 绘制图片
      ctx.drawImage(img, x, y, width, height);
      
      // 保存图片信息用于坐标转换
      this.setData({
        imageInfo: {
          x, y, width, height,
          originalWidth: img.width,
          originalHeight: img.height
        }
      });
      
      // 绘制已有的标记点
      this.drawMarkingPoints();
    };
  },

  // 开始标记
  startMarking() {
    this.setData({ isMarking: true });
    wx.showToast({
      title: '请在图片上绘制佩戴位置弧线',
      icon: 'none',
      duration: 2000
    });
  },

  // 结束标记
  endMarking() {
    this.setData({ isMarking: false });
    
    // 保存标记点
    if (this.data.markingPoints.length > 0) {
      this.saveMarkingPoints();
    }
  },

  // 清除标记
  clearMarking() {
    this.setData({ markingPoints: [] });
    const { ctx } = this.data;
    if (ctx) {
      ctx.clearRect(0, 0, this.data.canvas.width, this.data.canvas.height);
      this.drawImageOnCanvas(this.data.preWearImage);
    }
  },

  // canvas触摸事件
  onCanvasTouchStart(e: any) {
    if (!this.data.isMarking) return;
    
    const touch = e.touches[0];
    const point = this.convertCanvasPoint(touch.x, touch.y);
    
    if (point) {
      this.setData({
        markingPoints: [point]
      });
      this.drawPoint(point);
    }
  },

  onCanvasTouchMove(e: any) {
    if (!this.data.isMarking || !this.data.markingPoints.length) return;
    
    const touch = e.touches[0];
    const point = this.convertCanvasPoint(touch.x, touch.y);
    
    if (point) {
      const newPoints = [...this.data.markingPoints, point];
      this.setData({ markingPoints: newPoints });
      this.drawLine(this.data.markingPoints[this.data.markingPoints.length - 1], point);
    }
  },

  onCanvasTouchEnd() {
    if (this.data.isMarking && this.data.markingPoints.length > 1) {
      this.endMarking();
    }
  },

  // 转换canvas坐标到图片坐标
  convertCanvasPoint(canvasX: number, canvasY: number) {
    const { imageInfo } = this.data;
    if (!imageInfo) return null;
    
    // 计算相对于图片的坐标
    const x = (canvasX - imageInfo.x) / imageInfo.width * imageInfo.originalWidth;
    const y = (canvasY - imageInfo.y) / imageInfo.height * imageInfo.originalHeight;
    
    // 确保坐标在图片范围内
    if (x >= 0 && x <= imageInfo.originalWidth && y >= 0 && y <= imageInfo.originalHeight) {
      return { x: Math.round(x), y: Math.round(y) };
    }
    
    return null;
  },

  // 绘制点
  drawPoint(point: { x: number, y: number }) {
    const { ctx, imageInfo } = this.data;
    if (!ctx || !imageInfo) return;
    
    // 转换回canvas坐标
    const canvasX = point.x / imageInfo.originalWidth * imageInfo.width + imageInfo.x;
    const canvasY = point.y / imageInfo.originalHeight * imageInfo.height + imageInfo.y;
    
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0000';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  },

  // 绘制线
  drawLine(point1: { x: number, y: number }, point2: { x: number, y: number }) {
    const { ctx, imageInfo } = this.data;
    if (!ctx || !imageInfo) return;
    
    // 转换回canvas坐标
    const canvasX1 = point1.x / imageInfo.originalWidth * imageInfo.width + imageInfo.x;
    const canvasY1 = point1.y / imageInfo.originalHeight * imageInfo.height + imageInfo.y;
    const canvasX2 = point2.x / imageInfo.originalWidth * imageInfo.width + imageInfo.x;
    const canvasY2 = point2.y / imageInfo.originalHeight * imageInfo.height + imageInfo.y;
    
    ctx.beginPath();
    ctx.moveTo(canvasX1, canvasY1);
    ctx.lineTo(canvasX2, canvasY2);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.stroke();
  },

  // 绘制所有标记点
  drawMarkingPoints() {
    const { markingPoints } = this.data;
    if (markingPoints.length === 0) return;
    
    // 重新绘制图片
    this.drawImageOnCanvas(this.data.preWearImage);
    
    // 绘制所有点和线
    for (let i = 0; i < markingPoints.length; i++) {
      this.drawPoint(markingPoints[i]);
      if (i > 0) {
        this.drawLine(markingPoints[i - 1], markingPoints[i]);
      }
    }
  },

  // 保存标记点
  async saveMarkingPoints() {
    if (!this.data.currentRecordId || this.data.markingPoints.length === 0) return;
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'saveMarkingPoints',
          recordId: this.data.currentRecordId,
          markingPoints: this.data.markingPoints
        }
      });
      
      if (result.result.code === 200) {
        wx.showToast({
          title: '标记已保存',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('保存标记点失败:', error);
    }
  },

  // 步骤3: 选择佩戴后图片
  choosePostWearImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.uploadPostWearImage(res.tempFilePaths[0]);
      }
    });
  },

  // 上传佩戴后图片
  async uploadPostWearImage(imagePath: string) {
    if (!this.data.currentRecordId) {
      wx.showToast({
        title: '请先上传佩戴前图片',
        icon: 'error'
      });
      return;
    }
    
    wx.showLoading({ 
      title: '上传中...',
      mask: true
    });
    
    try {
      // 1. 上传图片到云存储
      const cloudPath = `device-location/temp_${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: imagePath
      });
      
      // 2. 调用云函数保存记录
      const fileName = imagePath.substring(imagePath.lastIndexOf('/') + 1);
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'uploadPostWearImage',
          recordId: this.data.currentRecordId,
          fileID: uploadResult.fileID,
          fileName: fileName
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          postWearImage: result.result.data.imageUrl,
          currentStep: 4 // 进入分析步骤
        });
        
        // 自动开始分析
        this.analyzeWearPosition();
      } else {
        wx.showToast({
          title: result.result.message || '上传失败',
          icon: 'error'
        });
      }
    } catch (error: any) {
      console.error('上传佩戴后图片失败:', error);
      wx.showToast({
        title: error.errMsg || '上传失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 分析佩戴位置
  async analyzeWearPosition() {
    if (!this.data.currentRecordId) return;
    
    wx.showLoading({ 
      title: '分析中...',
      mask: true
    });
    
    try {
      const result = await wx.cloud.callFunction({
        name: 'deviceLocation',
        data: {
          action: 'analyzeWearPosition',
          recordId: this.data.currentRecordId
        }
      });
      
      if (result.result.code === 200) {
        this.setData({
          analysisResult: result.result.data.analysisResult,
          score: result.result.data.score
        });
        
        // 重新加载历史记录
        this.loadLocationHistory();
      } else {
        wx.showToast({
          title: result.result.message || '分析失败',
          icon: 'error'
        });
      }
    } catch (error) {
      console.error('分析佩戴位置失败:', error);
      wx.showToast({
        title: '分析失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  // 重新开始
  restartProcess() {
    this.setData({
      currentStep: 1,
      preWearImage: '',
      postWearImage: '',
      markingPoints: [],
      currentRecordId: '',
      analysisResult: null,
      score: 0,
      isMarking: false
    });
    
    // 清除canvas
    const { ctx } = this.data;
    if (ctx) {
      ctx.clearRect(0, 0, this.data.canvas.width, this.data.canvas.height);
    }
  },

  // 查看历史记录详情
  viewHistoryDetail(e: any) {
    const id = e.currentTarget.dataset.id;
    wx.showModal({
      title: '历史记录',
      content: `记录ID: ${id}\n点击确定查看详情`,
      showCancel: true,
      success: (res) => {
        if (res.confirm) {
          // 这里可以跳转到详情页面
          wx.showToast({
            title: '详情功能开发中',
            icon: 'none'
          });
        }
      }
    });
  },

  // 分享结果
  shareResult() {
    if (!this.data.analysisResult) return;
    
    wx.showShareMenu({
      withShareTicket: true
    });
    
    wx.showToast({
      title: '点击右上角分享',
      icon: 'none'
    });
  }
});