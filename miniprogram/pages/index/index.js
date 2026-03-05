/**
 * 首页
 * 阿姨快约 - 保姆/育儿嫂中介小程序（云开发版）
 */
const app = getApp();
const {
  USER_ROLE,
  BOOKING_STATUS,
  BOOKING_STATUS_TEXT,
  OPEN_SERVICE_CITIES,
  SERVICE_CITY_OPTIONS
} = require('../../utils/constants');
const { ROLE_VIEW_MODE, getRoleFlagsByRole, getEffectiveRole } = require('../../utils/role');

const MANUAL_CITY_STORAGE_KEY = 'manual_service_city';
const ROLE_VIEW_MODE_STORAGE_KEY = 'platform_role_view_mode';
const CITY_BOUNDARIES = {
  '北京市': { minLat: 39.4, maxLat: 41.1, minLng: 115.7, maxLng: 117.5 },
  '西安市': { minLat: 33.7, maxLat: 34.8, minLng: 107.6, maxLng: 109.9 }
};

Page({
  /**
   * 页面初始数据
   */
  data: {
    roleLoading: true,
    isWorkerHome: false,
    isPlatformHome: false,
    workerInfo: null,
    workerSettings: null,
    pendingBookings: [],
    interviewBookings: [],
    orderCreatedBookings: [],
    workerStats: {
      pendingCount: 0,
      interviewCount: 0,
      orderCreatedCount: 0
    },
    platformAcceptedBookings: [],
    platformInterviewBookings: [],
    platformDoneToday: [],
    platformDoneRecent7: [],
    platformStats: {
      acceptedCount: 0,
      scheduledCount: 0,
      doneCount: 0
    },

    // 搜索关键词
    searchKeyword: '',
    
    // 轮播图数据
    banners: [
      {
        id: 1,
        image: 'https://636c-cloud1-9gb9q6d09a380783-1256037011.tcb.qcloud.la/images/banner1.jpg?sign=855f4a5044f9d1f290f4bec8b7a32686&t=1772349817',
        title: '专业服务 值得信赖',
        link: '/pages/workers/workers'
      },
      {
        id: 2,
        image: 'https://636c-cloud1-9gb9q6d09a380783-1256037011.tcb.qcloud.la/images/banner2.jpg?sign=c0e65c2597ed3fcba90af93a30b15a95&t=1772349940',
        title: '优质阿姨 等您挑选',
        link: '/pages/workers/workers'
      },
      {
        id: 3,
        image: 'https://636c-cloud1-9gb9q6d09a380783-1256037011.tcb.qcloud.la/images/banner3.jpg?sign=cb8990f9d4a900b15e7a533654e2d40d&t=1772349957',
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

    // 服务城市
    currentCity: '未定位',
    citySource: '',
    citySupported: false,
    cityLoading: false,
    locationDenied: false,
    openServiceCities: OPEN_SERVICE_CITIES,
    openServiceCitiesText: OPEN_SERVICE_CITIES.join('、'),

    // 加载状态
    loading: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.initHomeData();
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
    this.initHomeData();
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    console.log('触发下拉刷新');
    this.initHomeData(() => {
      console.log('下拉刷新完成');
      wx.stopPullDownRefresh();
    });
  },

  initHomeData(callback) {
    this.setData({ roleLoading: true });

    const done = () => {
      this.setData({ roleLoading: false });
      if (callback) callback();
    };

    if (!app.globalData.isLogin) {
      this.setData({ isWorkerHome: false, isPlatformHome: false });
      this.ensureServiceCity().finally(() => this.loadRecommendWorkers(done));
      return;
    }

    app.callCloudFunction('user', 'getProfile')
      .then((res) => {
        const role = res && res.data && res.data.role ? res.data.role : USER_ROLE.USER;
        const roleViewMode = this.getRoleViewMode(role);
        const effectiveRole = getEffectiveRole(role, roleViewMode);
        const roleFlags = getRoleFlagsByRole(effectiveRole);
        if (roleFlags.isWorker) {
          this.setData({
            isWorkerHome: true,
            isPlatformHome: false,
            workerInfo: res.data.workerInfo || null
          });
          this.loadWorkerHomeData(done);
          return;
        }
        if (roleFlags.isPlatform) {
          this.setData({
            isWorkerHome: false,
            isPlatformHome: true,
            workerInfo: null
          });
          this.promptPlatformSubscribeOncePerDay();
          this.loadPlatformHomeData(done);
          return;
        }

        this.setData({
          isWorkerHome: false,
          isPlatformHome: false,
          workerInfo: null
        });
        this.ensureServiceCity().finally(() => this.loadRecommendWorkers(done));
      })
      .catch((err) => {
        console.error('初始化首页失败:', err);
        this.setData({ isWorkerHome: false, isPlatformHome: false });
        this.ensureServiceCity().finally(() => this.loadRecommendWorkers(done));
      });
  },

  getRoleViewMode(rawRole) {
    if (rawRole !== ROLE_VIEW_MODE.PLATFORM) return ROLE_VIEW_MODE.USER;
    const globalMode = app.globalData.platformRoleViewMode;
    if (globalMode === ROLE_VIEW_MODE.USER || globalMode === ROLE_VIEW_MODE.PLATFORM) return globalMode;
    const cached = wx.getStorageSync(ROLE_VIEW_MODE_STORAGE_KEY);
    if (cached === ROLE_VIEW_MODE.USER || cached === ROLE_VIEW_MODE.PLATFORM) {
      app.globalData.platformRoleViewMode = cached;
      return cached;
    }
    app.globalData.platformRoleViewMode = ROLE_VIEW_MODE.PLATFORM;
    return ROLE_VIEW_MODE.PLATFORM;
  },

  promptPlatformSubscribeOncePerDay() {
    if (!app.globalData.isLogin) return;
    const key = 'platform_subscribe_prompt_date';
    const today = this.formatDateText(new Date());
    const promptedDate = wx.getStorageSync(key);
    if (promptedDate === today) return;

    wx.setStorageSync(key, today);
    app.requestSubscribeNotifications({ showToast: false }).catch(() => null);
  },

  /**
   * 加载推荐阿姨
   */
  loadRecommendWorkers(callback) {
    this.setData({ loading: true });

    app.callCloudFunction('worker', 'getList', { page: 1, limit: 8 })
      .then((res) => {
        const list = res && res.data && Array.isArray(res.data.list) ? res.data.list : [];
        this.setData({
          recommendWorkers: list,
          loading: false
        });
        if (callback) callback();
      })
      .catch((err) => {
        console.error('加载推荐阿姨失败:', err);
        this.setData({ loading: false });
        app.showToast(err.message || '加载失败');
        if (callback) callback();
      });
  },

  loadWorkerHomeData(callback) {
    this.setData({ loading: true });
    Promise.all([
      app.callCloudFunction('user', 'getMyWorkerSettings').catch(() => ({ data: null })),
      app.callCloudFunction('worker', 'getWorkerBookings', { page: 1, limit: 50 }).catch(() => ({ data: { list: [] } }))
    ])
      .then(([settingsRes, bookingsRes]) => {
        const settings = settingsRes && settingsRes.data ? settingsRes.data : null;
        const list = bookingsRes && bookingsRes.data && bookingsRes.data.list ? bookingsRes.data.list : [];

        const pendingBookings = list.filter(item => item.status === BOOKING_STATUS.PENDING).slice(0, 3);
        const interviewBookings = list.filter(item => item.status === BOOKING_STATUS.INTERVIEW_SCHEDULED).slice(0, 3);
        const orderCreatedBookings = list.filter(item => item.status === BOOKING_STATUS.ORDER_CREATED).slice(0, 3);

        this.setData({
          loading: false,
          workerSettings: settings,
          pendingBookings,
          interviewBookings,
          orderCreatedBookings,
          workerStats: {
            pendingCount: list.filter(item => item.status === BOOKING_STATUS.PENDING).length,
            interviewCount: list.filter(item => item.status === BOOKING_STATUS.INTERVIEW_SCHEDULED).length,
            orderCreatedCount: list.filter(item => item.status === BOOKING_STATUS.ORDER_CREATED).length
          }
        });
        if (callback) callback();
      })
      .catch((err) => {
        console.error('加载阿姨首页失败:', err);
        this.setData({ loading: false });
        app.showToast(err.message || '加载失败');
        if (callback) callback();
      });
  },

  loadPlatformHomeData(callback) {
    this.setData({ loading: true });
    Promise.all([
      app.callCloudFunction('worker', 'getPlatformBookings', { filter: 'accepted', page: 1, limit: 50 }).catch(() => ({ data: { list: [] } })),
      app.callCloudFunction('worker', 'getPlatformBookings', { filter: 'interview_scheduled', page: 1, limit: 50 }).catch(() => ({ data: { list: [] } })),
      app.callCloudFunction('worker', 'getPlatformBookings', { filter: 'done', page: 1, limit: 50 }).catch(() => ({ data: { list: [] } }))
    ])
      .then(([acceptedRes, scheduledRes, doneRes]) => {
        const acceptedList = acceptedRes && acceptedRes.data && acceptedRes.data.list ? acceptedRes.data.list : [];
        const scheduledList = scheduledRes && scheduledRes.data && scheduledRes.data.list ? scheduledRes.data.list : [];
        const doneList = doneRes && doneRes.data && doneRes.data.list ? doneRes.data.list : [];

        const doneListWithText = doneList.map((item) => ({
          ...item,
          statusText: BOOKING_STATUS_TEXT[item.status] || item.status || '未知状态',
          doneTimeText: this.formatDateText(item.updatedAt || item.createdAt)
        }));
        const platformDoneToday = doneListWithText.filter(item => this.isToday(item.updatedAt || item.createdAt)).slice(0, 5);
        const platformDoneRecent7 = doneListWithText
          .filter(item => this.isWithinRecentDays(item.updatedAt || item.createdAt, 7) && !this.isToday(item.updatedAt || item.createdAt))
          .slice(0, 8);

        this.setData({
          loading: false,
          platformAcceptedBookings: acceptedList.slice(0, 3),
          platformInterviewBookings: scheduledList.slice(0, 3),
          platformDoneToday,
          platformDoneRecent7,
          platformStats: {
            acceptedCount: acceptedList.length,
            scheduledCount: scheduledList.length,
            doneCount: doneList.length
          }
        });
        if (callback) callback();
      })
      .catch((err) => {
        console.error('加载平台首页失败:', err);
        this.setData({ loading: false });
        app.showToast(err.message || '加载失败');
        if (callback) callback();
      });
  },

  parseCloudDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (value && typeof value === 'object' && typeof value.seconds === 'number') {
      return new Date(value.seconds * 1000);
    }
    return null;
  },

  isToday(value) {
    const date = this.parseCloudDate(value);
    if (!date) return false;
    const now = new Date();
    return date.getFullYear() === now.getFullYear()
      && date.getMonth() === now.getMonth()
      && date.getDate() === now.getDate();
  },

  isWithinRecentDays(value, days) {
    const date = this.parseCloudDate(value);
    if (!date) return false;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.floor((todayStart.getTime() - dateStart.getTime()) / (24 * 60 * 60 * 1000));
    return diffDays >= 0 && diffDays < days;
  },

  formatDateText(value) {
    const date = this.parseCloudDate(value);
    if (!date) return '-';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  ensureServiceCity() {
    this.setData({ cityLoading: true });
    const manualCity = wx.getStorageSync(MANUAL_CITY_STORAGE_KEY);
    return this.resolveCityByLocation()
      .then((city) => {
        if (city) {
          this.applyServiceCity(city, 'auto');
          return;
        }
        if (manualCity) {
          this.applyServiceCity(manualCity, 'manual');
          return;
        }
        this.applyServiceCity('未开通城市', 'unknown');
      })
      .catch(() => {
        if (manualCity) {
          this.applyServiceCity(manualCity, 'manual');
          return;
        }
        this.applyServiceCity('未开通城市', 'unknown');
      })
      .finally(() => {
        this.setData({ cityLoading: false });
      });
  },

  resolveCityByLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          this.setData({ locationDenied: false });
          resolve(this.getOpenCityByCoordinate(res.latitude, res.longitude));
        },
        fail: (err) => {
          const permissionDenied = err && (err.errMsg || '').includes('auth deny');
          this.setData({ locationDenied: permissionDenied });
          reject(err);
        }
      });
    });
  },

  getOpenCityByCoordinate(latitude, longitude) {
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return '';
    const city = Object.keys(CITY_BOUNDARIES).find((name) => {
      const boundary = CITY_BOUNDARIES[name];
      return latitude >= boundary.minLat
        && latitude <= boundary.maxLat
        && longitude >= boundary.minLng
        && longitude <= boundary.maxLng;
    });
    return city || '';
  },

  applyServiceCity(city, source) {
    const normalizedCity = city || '未开通城市';
    const citySupported = OPEN_SERVICE_CITIES.includes(normalizedCity);
    this.setData({
      currentCity: normalizedCity,
      citySource: source || '',
      citySupported
    });
  },

  guardServiceAvailable(actionText) {
    if (this.data.isWorkerHome || this.data.isPlatformHome) return true;
    if (this.data.cityLoading) {
      app.showToast('正在定位服务城市，请稍后');
      return false;
    }
    if (this.data.citySupported) {
      return true;
    }

    wx.showModal({
      title: '服务暂未开通',
      content: `当前仅支持${OPEN_SERVICE_CITIES.join('、')}。${actionText}暂不可用。`,
      showCancel: false
    });
    return false;
  },

  onSwitchCity() {
    const itemList = SERVICE_CITY_OPTIONS.map(item => item.label).concat('其他城市（暂未开通）');
    wx.showActionSheet({
      itemList,
      success: (res) => {
        const index = res.tapIndex;
        if (index < SERVICE_CITY_OPTIONS.length) {
          const city = SERVICE_CITY_OPTIONS[index].value;
          wx.setStorageSync(MANUAL_CITY_STORAGE_KEY, city);
          this.applyServiceCity(city, 'manual');
          return;
        }
        wx.removeStorageSync(MANUAL_CITY_STORAGE_KEY);
        this.applyServiceCity('未开通城市', 'manual');
      }
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
   * 点击搜索栏（跳转到搜索页面）
   */
  onSearchTap() {
    if (!this.guardServiceAvailable('搜索阿姨')) return;
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
    if (!this.guardServiceAvailable('查看服务')) return;
    const { type } = e.currentTarget.dataset;
    if (!type) return;
    wx.navigateTo({
      url: `/pages/workers/workers?type=${type}`
    });
  },

  onGoWorkerBookings() {
    wx.navigateTo({
      url: '/packageB/pages/bookings/bookings'
    });
  },

  onWorkerAccept(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    app.callCloudFunction('worker', 'acceptBooking', { bookingId })
      .then(() => {
        app.showToast('已接受预约', 'success');
        this.loadWorkerHomeData();
      })
      .catch((err) => {
        app.showToast(err.message || '操作失败');
      });
  },

  onWorkerReject(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    wx.showModal({
      title: '拒绝预约',
      editable: true,
      placeholderText: '可选：填写拒绝原因',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('worker', 'rejectBooking', {
          bookingId,
          reason: res.content || ''
        })
          .then(() => {
            app.showToast('已拒绝预约', 'success');
            this.loadWorkerHomeData();
          })
          .catch((err) => app.showToast(err.message || '操作失败'));
      }
    });
  },

  onViewOrder(e) {
    const orderId = e.currentTarget.dataset.orderId;
    if (!orderId) return;
    wx.navigateTo({
      url: `/packageB/pages/order-detail/order-detail?id=${orderId}`
    });
  },

  onContactPlatform() {
    app.contactService({
      title: '联系平台',
      content: '平台客服：400-888-8888\n服务时间：9:00-21:00'
    });
  },

  onGoWorkerSettings() {
    wx.navigateTo({
      url: '/packageA/pages/worker-settings/worker-settings'
    });
  },

  onGoRulesTraining() {
    wx.navigateTo({
      url: '/packageC/pages/rules-training/rules-training'
    });
  },

  onGoInterviewAdmin() {
    wx.navigateTo({
      url: '/packageC/pages/interview-admin/interview-admin'
    });
  },

  onPlatformScheduleInterview(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    wx.showModal({
      title: '安排面试',
      editable: true,
      placeholderText: '请输入面试时间，如 2026-03-01 10:00',
      success: (res) => {
        if (!res.confirm) return;
        const interviewTime = (res.content || '').trim();
        if (!interviewTime) {
          app.showToast('请填写面试时间');
          return;
        }
        app.callCloudFunction('worker', 'platformScheduleInterview', {
          bookingId,
          interviewTime,
          platformNote: '平台已安排面试'
        })
          .then(() => {
            app.showToast('面试已安排', 'success');
            this.loadPlatformHomeData();
          })
          .catch((err) => {
            app.showToast(err.message || '操作失败');
          });
      }
    });
  },

  onPlatformSetResult(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    const passed = !!e.currentTarget.dataset.passed;
    if (!bookingId) return;
    wx.showModal({
      title: passed ? '面试通过' : '面试不通过',
      content: passed ? '确认标记面试通过？' : '确认标记面试不通过？',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('worker', 'platformSetInterviewResult', {
          bookingId,
          passed,
          platformNote: passed ? '平台判定面试通过' : '平台判定面试不通过'
        })
          .then(() => {
            app.showToast('更新成功', 'success');
            this.loadPlatformHomeData();
          })
          .catch((err) => {
            app.showToast(err.message || '操作失败');
          });
      }
    });
  },

  /**
   * 推荐阿姨点击
   */
  onWorkerTap(e) {
    if (!this.guardServiceAvailable('查看阿姨详情')) return;
    const { workerId } = e.detail;
    wx.navigateTo({
      url: `/packageA/pages/worker-detail/worker-detail?id=${workerId}`
    });
  },

  /**
   * 查看更多阿姨
   */
  onMoreTap() {
    if (!this.guardServiceAvailable('查看更多阿姨')) return;
    wx.navigateTo({
      url: '/pages/workers/workers'
    });
  },

  /**
   * 点击预约按钮
   */
  onBookTap(e) {
    if (!this.guardServiceAvailable('预约阿姨')) return;
    // 检查登录状态
    if (!app.globalData.isLogin) {
      this.showLoginModal('预约阿姨');
      return;
    }
    
    const { workerId, worker } = e.detail;
    if (worker && worker.isBooked) {
      app.showToast('您已预约该阿姨');
      return;
    }
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
    if (!this.guardServiceAvailable('查看更多阿姨')) return;
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
