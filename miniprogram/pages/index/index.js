/**
 * 首页
 * 爱心家政 - 保姆/育儿嫂中介小程序（云开发版）
 */
const app = getApp();

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 搜索关键词
    searchKeyword: '',
    
    // 轮播图数据
    banners: [
      {
        id: 1,
        image: '/images/banner1.jpg',
        title: '专业服务 值得信赖',
        link: '/pages/workers/workers'
      },
      {
        id: 2,
        image: '/images/banner2.jpg',
        title: '优质阿姨 等您挑选',
        link: '/pages/workers/workers'
      },
      {
        id: 3,
        image: '/images/banner3.jpg',
        title: '新用户首单优惠',
        link: '/packageA/pages/booking/booking'
      }
    ],
    
    // 服务类型
    serviceTypes: [
      {
        id: 'babysitter',
        name: '保姆',
        icon: '👩',
        bgColor: '#FFE4E1',
        desc: '日常家务',
        filterType: 'babysitter'
      },
      {
        id: 'nanny',
        name: '育儿嫂',
        icon: '👶',
        bgColor: '#E0FFFF',
        desc: '专业育儿',
        filterType: 'nanny'
      },
      {
        id: 'maternity',
        name: '月嫂',
        icon: '🤱',
        bgColor: '#FFF0F5',
        desc: '产后护理',
        filterType: 'maternity'
      },
      {
        id: 'elderly',
        name: '护老',
        icon: '👴',
        bgColor: '#F0FFF0',
        desc: '老人陪护',
        filterType: 'elderly'
      }
    ],
    
    // 服务优势
    advantages: [
      { icon: '✅', text: '实名认证' },
      { icon: '🛡️', text: '安全保障' },
      { icon: '💯', text: '品质服务' }
    ],
    
    // 推荐阿姨
    recommendWorkers: [],
    
    // 加载状态
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 加载推荐阿姨数据
    this.loadRecommendWorkers();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时刷新数据
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      });
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    console.log('触发下拉刷新');
    // 下拉刷新
    this.loadRecommendWorkers(() => {
      console.log('下拉刷新完成');
      wx.stopPullDownRefresh();
    });
  },

  /**
   * 加载推荐阿姨
   */
  loadRecommendWorkers(callback) {
    this.setData({ loading: true });
    
    // 调用云函数获取推荐阿姨
    app.callCloudFunction('home', 'getRecommendations', { limit: 6 })
      .then((res) => {
        console.log('推荐阿姨数据:', res.data);
        this.setData({
          recommendWorkers: res.data || [],
          loading: false
        });
        if (callback) callback();
      })
      .catch((err) => {
        console.error('加载推荐阿姨失败:', err);
        app.showToast(err.message || '加载失败');
        if (callback) callback();
      });
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 搜索确认
   */
  onSearchConfirm(e) {
    const keyword = e.detail.value;
    if (keyword.trim()) {
      wx.navigateTo({
        url: `/pages/workers/workers?keyword=${encodeURIComponent(keyword)}`
      });
    }
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
  },

  /**
   * 搜索确认
   */
  onSearchConfirm(e) {
    const keyword = e.detail.value;
    if (keyword.trim()) {
      wx.navigateTo({
        url: `/pages/workers/workers?keyword=${encodeURIComponent(keyword)}`
      });
    }
  },

  /**
   * 点击搜索栏（跳转到搜索页面）
   */
  onSearchTap() {
    wx.navigateTo({
      url: '/pages/workers/workers'
    });
  },

  /**
   * 轮播图点击
   */
  onBannerTap(e) {
    const { item } = e.currentTarget.dataset;
    if (item.link) {
      wx.navigateTo({
        url: item.link
      });
    }
  },

  /**
   * 服务类型点击
   */
  onServiceTap(e) {
    const { type } = e.currentTarget.dataset;
    if (!type) return;
    wx.navigateTo({
      url: `/pages/workers/workers?type=${type}`
    });
  },

  /**
   * 推荐阿姨点击
   */
  onWorkerTap(e) {
    const { workerId } = e.detail;
    wx.navigateTo({
      url: `/packageA/pages/worker-detail/worker-detail?id=${workerId}`
    });
  },

  /**
   * 查看更多阿姨
   */
  onMoreTap() {
    wx.navigateTo({
      url: '/pages/workers/workers'
    });
  },

  /**
   * 点击预约按钮
   */
  onBookTap(e) {
    // 检查登录状态
    if (!app.globalData.isLogin) {
      this.showLoginModal('预约阿姨');
      return;
    }
    
    const { workerId } = e.detail;
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
   * 查看更多阿姨
   */
  onViewMoreTap() {
    wx.navigateTo({
      url: '/pages/workers/workers'
    });
  },

  /**
   * 分享
   */
  onShareAppMessage() {
    return {
      title: '爱心家政 - 专业保姆育儿嫂服务',
      desc: '提供优质保姆、育儿嫂、月嫂服务，让您的生活更轻松！',
      path: '/pages/index/index',
      imageUrl: '/images/share.png'
    };
  },

  /**
   * 分享到朋友圈
   */
  onShareTimeline() {
    return {
      title: '爱心家政 - 专业保姆育儿嫂服务',
      query: '',
      imageUrl: '/images/share.png'
    };
  }
});
