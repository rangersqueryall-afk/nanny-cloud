/**
 * 阿姨详情页
 * 展示阿姨的详细信息、工作经历、用户评价
 */
const app = getApp();
const { SERVICE_TYPE_TEXT } = require('../../../utils/constants');
const { getRoleFlagsByUser } = require('../../../utils/role');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 阿姨ID
    workerId: null,
    
    // 阿姨信息
    worker: {},
    
    // 用户评价
    reviews: [],
    
    // 是否已收藏
    isCollected: false,
    
    // 加载状态
    isLoading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ workerId: id });
    
    // 加载阿姨详情
    this.loadWorkerDetail(id);
    
    // 加载评价
    this.loadReviews(id);
    
    // 检查收藏状态
    this.checkCollectStatus(id);
  },

  /**
   * 加载阿姨详情
   */
  loadWorkerDetail(id) {
    app.callCloudFunction('worker', 'getDetail', { id })
      .then((res) => {
        const worker = this.normalizeWorkerData(res.data || {}, id);
        this.setData({
          worker,
          isLoading: false
        });
        wx.setNavigationBarTitle({
          title: worker.name || '阿姨详情'
        });
      })
      .catch((err) => {
        console.error('加载阿姨详情失败:', err);
        this.setData({ isLoading: false });
        wx.showToast({
          title: err.message || '加载失败',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1200);
      });
  },

  normalizeWorkerData(worker, id) {
    const serviceTypes = worker.serviceTypes || [];
    return {
      _id: worker._id || id,
      id: worker.id || worker._id || id,
      name: worker.name || '阿姨',
      age: worker.age || 0,
      hometown: worker.hometown || '未知',
      experience: worker.experience || 0,
      price: worker.price || { daily: 0, monthly: 0 },
      hourlyPrice: worker.hourlyPrice || 50,
      rating: worker.rating || 5.0,
      orderCount: worker.orderCount || 0,
      reviewCount: worker.reviewCount || 0,
      skills: worker.skills || [],
      serviceTypes,
      serviceTypesText: worker.serviceTypesText || serviceTypes.map(type => SERVICE_TYPE_TEXT[type] || type),
      avatar: worker.avatar || '/images/default-avatar.png',
      isVerified: worker.isVerified !== false,
      introduction: worker.introduction || worker.bio || '暂无简介',
      experiences: worker.experiences || []
    };
  },

  /**
   * 加载用户评价
   */
  loadReviews(id) {
    app.callCloudFunction('worker', 'getReviews', {
      id,
      page: 1,
      limit: 20
    })
      .then((res) => {
        const list = (res.data && res.data.list ? res.data.list : []).map((item, index) => ({
          id: item._id || item.id || index + 1,
          userName: item.userNickname || item.userName || '匿名用户',
          userAvatar: item.userAvatar || '/images/default-avatar.png',
          rating: item.rating || 5,
          date: this.formatReviewDate(item.createdAt),
          content: item.content || '',
          tags: item.tags || []
        }));

        this.setData({
          reviews: list
        });
      })
      .catch((err) => {
        console.error('加载评价失败:', err);
        this.setData({
          reviews: []
        });
      });
  },

  formatReviewDate(value) {
    if (!value) return '';
    let date = null;
    if (value instanceof Date) {
      date = value;
    } else if (typeof value === 'string' || typeof value === 'number') {
      date = new Date(value);
    } else if (value && typeof value === 'object' && typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    }
    if (!date || Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * 检查收藏状态
   */
  checkCollectStatus(id) {
    app.callCloudFunction('worker', 'checkFavorite', { workerId: id })
      .then((res) => {
        const isCollected = !!(res.data && res.data.isFavorite);
        this.setData({ isCollected });
      })
      .catch((err) => {
        console.error('检查收藏状态失败:', err);
        this.setData({ isCollected: false });
      });
  },

  /**
   * 点击收藏
   */
  onCollect() {
    // 检查登录状态
    if (!app.globalData.isLogin) {
      this.showLoginModal('收藏阿姨');
      return;
    }

    const roleFlags = getRoleFlagsByUser(app.globalData.userInfo);
    if (!roleFlags.isEmployer) {
      wx.showToast({
        title: '仅雇主可收藏',
        icon: 'none'
      });
      return;
    }
    
    const { workerId, isCollected, worker } = this.data;
    const workerIdValue = worker._id || worker.id || workerId;
    const action = isCollected ? 'removeFavorite' : 'addFavorite';

    app.callCloudFunction('worker', action, {
      workerId: workerIdValue,
      workerName: worker.name,
      workerAvatar: worker.avatar
    })
      .then(() => {
        this.setData({ isCollected: !isCollected });
        wx.showToast({
          title: isCollected ? '已取消收藏' : '收藏成功',
          icon: isCollected ? 'none' : 'success'
        });
      })
      .catch((err) => {
        console.error('收藏操作失败:', err);
        wx.showToast({
          title: err.message || '操作失败',
          icon: 'none'
        });
      });
  },

  /**
   * 点击咨询
   */
  onContact() {
    app.contactService();
  },

  /**
   * 点击预约
   */
  onBook() {
    // 检查登录状态
    if (!app.globalData.isLogin) {
      this.showLoginModal('预约阿姨');
      return;
    }
    
    const { workerId } = this.data;
    wx.navigateTo({
      url: `/packageA/pages/booking/booking?workerId=${workerId}`
    });
  },

  /**
   * 显示登录弹框
   */
  showLoginModal(actionText) {
    wx.showModal({
      title: '提示',
      content: `请先登录后${actionText}`,
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          // 调用登录
          this.doLogin();
        }
      }
    });
  },

  /**
   * 执行登录
   */
  doLogin() {
    wx.showLoading({ title: '登录中...' });
    
    // 获取微信用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (userRes) => {
        const userInfo = userRes.userInfo;
        
        app.callCloudFunction('user', 'login', {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        })
          .then((loginRes) => {
            wx.hideLoading();
            const data = loginRes.data;
            
            app.globalData.userInfo = data.userInfo;
            app.globalData.isLogin = true;
            wx.setStorageSync('userInfo', data.userInfo);
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });
          })
          .catch((err) => {
            wx.hideLoading();
            console.error('登录失败:', err);
            wx.showToast({
              title: err.message || '登录失败，请重试',
              icon: 'none'
            });
          });
      },
      fail: (err) => {
        wx.hideLoading();
        console.error('获取用户信息失败:', err);
        wx.showToast({
          title: '请授权获取用户信息',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 查看更多评价
   */
  onMoreReviews() {
    const { workerId } = this.data;
    wx.navigateTo({
      url: `/pages/reviews/reviews?workerId=${workerId}`
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { worker, workerId } = this.data;
    return {
      title: `${worker.name} - ${worker.experience}年经验专业家政服务`,
      path: `/packageA/pages/worker-detail/worker-detail?id=${worker._id || worker.id || workerId}`,
      imageUrl: worker.avatar
    };
  }
});
