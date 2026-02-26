/**
 * 评价页面
 * 用户对完成的订单进行评价
 */
const app = getApp();

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 订单ID
    orderId: null,
    
    // 订单信息
    order: {},
    
    // 评分
    ratings: {
      overall: 5
    },
    
    // 评价标签
    reviewTags: [
      { name: '专业负责', selected: false },
      { name: '态度友好', selected: false },
      { name: '准时守信', selected: false },
      { name: '技能娴熟', selected: false },
      { name: '耐心细致', selected: false },
      { name: '沟通顺畅', selected: false },
      { name: '超出预期', selected: false },
      { name: '值得推荐', selected: false }
    ],
    
    // 评价内容
    reviewContent: '',
    
    // 是否匿名
    isAnonymous: false,
    
    // 提交状态
    isSubmitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { orderId } = options;
    
    if (!orderId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ orderId });
    
    // 加载订单信息
    this.loadOrderInfo(orderId);
  },

  /**
   * 加载订单信息
   */
  loadOrderInfo(orderId) {
    app.callCloudFunction('order', 'getDetail', { id: orderId })
      .then((res) => {
        const order = res.data || {};
        this.setData({
          order: {
            id: order._id || orderId,
            workerId: order.workerId,
            workerName: order.workerName || '阿姨',
            workerAvatar: order.workerAvatar || '/images/default-avatar.png',
            serviceType: order.serviceType || '',
            serviceDate: order.startDate || ''
          }
        });
      })
      .catch((err) => {
        wx.showToast({
          title: err.message || '加载失败',
          icon: 'none'
        });
        setTimeout(() => wx.navigateBack(), 1000);
      });
  },

  /**
   * 评分变化
   */
  onRatingChange(e) {
    const { key } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    this.setData({
      [`ratings.${key}`]: value
    });
  },

  /**
   * 选择标签
   */
  onTagTap(e) {
    const { index } = e.currentTarget.dataset;
    const { reviewTags } = this.data;
    
    const newTags = [...reviewTags];
    newTags[index].selected = !newTags[index].selected;
    
    this.setData({
      reviewTags: newTags
    });
  },

  /**
   * 输入评价内容
   */
  onContentInput(e) {
    this.setData({
      reviewContent: e.detail.value
    });
  },

  /**
   * 匿名开关变化
   */
  onAnonymousChange(e) {
    this.setData({
      isAnonymous: e.detail.value
    });
  },

  /**
   * 是否可以提交
   */
  canSubmit() {
    const { ratings, reviewContent } = this.data;
    
    // 必须评分
    if (ratings.overall <= 0) {
      return false;
    }
    
    // 评价内容至少10个字
    if (reviewContent.length < 10) {
      return false;
    }
    
    return true;
  },

  /**
   * 提交评价
   */
  onSubmit() {
    if (this.data.isSubmitting) return;
    
    // 验证
    if (!this.canSubmit()) {
      if (this.data.ratings.overall <= 0) {
        wx.showToast({
          title: '请进行评分',
          icon: 'none'
        });
      } else if (this.data.reviewContent.length < 10) {
        wx.showToast({
          title: '评价内容至少10个字',
          icon: 'none'
        });
      }
      return;
    }
    
    this.setData({ isSubmitting: true });
    
    // 构建评价数据
    const reviewData = {
      orderId: this.data.orderId,
      ratings: this.data.ratings,
      tags: this.data.reviewTags.filter(t => t.selected).map(t => t.name),
      content: this.data.reviewContent,
      isAnonymous: this.data.isAnonymous
    };
    
    console.log('提交评价:', reviewData);
    
    // 模拟提交
    setTimeout(() => {
      this.setData({ isSubmitting: false });
      
      wx.showToast({
        title: '评价成功',
        icon: 'success'
      });
      
      // 返回订单列表
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }, 1500);
  }
});
