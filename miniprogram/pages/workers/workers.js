/**
 * 阿姨列表页（云开发版）
 * 支持搜索、筛选、分页加载
 */
const app = getApp();
const { debounce } = require('../../utils/util');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 搜索关键词
    searchKeyword: '',
    
    // 筛选配置
    filterConfig: [
      {
        key: 'type',
        label: '服务类型',
        type: 'list',
        value: '',
        options: [
          { label: '全部', value: '' },
          { label: '保姆', value: 'babysitter' },
          { label: '育儿嫂', value: 'nanny' },
          { label: '月嫂', value: 'maternity' },
          { label: '护老', value: 'elderly' }
        ]
      },
      {
        key: 'priceRange',
        label: '价格',
        type: 'range',
        value: '',
        options: [
          { label: '全部', value: '' },
          { label: '5000以下', value: '0-5000' },
          { label: '5000-7000', value: '5000-7000' },
          { label: '7000-10000', value: '7000-10000' },
          { label: '10000以上', value: '10000-999999' }
        ]
      },
      {
        key: 'experience',
        label: '经验',
        type: 'list',
        value: '',
        options: [
          { label: '全部', value: '' },
          { label: '1年以内', value: '0' },
          { label: '1-3年', value: '1' },
          { label: '3-5年', value: '3' },
          { label: '5年以上', value: '5' }
        ]
      }
    ],
    
    // 当前筛选条件
    filters: {},
    
    // 阿姨列表
    workers: [],
    
    // 分页参数
    page: 1,
    pageSize: 10,
    hasMore: true,
    
    // 加载状态
    isLoading: false,
    isRefreshing: false,
    
    // 滚动位置
    scrollTop: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 处理页面参数
    if (options.type) {
      this.setFilterValue('type', options.type);
    }
    if (options.keyword) {
      this.setData({ searchKeyword: options.keyword });
    }
    
    // 加载初始数据
    this.loadWorkers(true);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // workers页面不是tabbar页面，不需要设置选中状态
  },

  /**
   * 搜索输入（防抖处理）
   */
  onSearchInput: debounce(function(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });
    this.loadWorkers(true);
  }, 500),

  /**
   * 执行搜索
   */
  onSearch() {
    this.loadWorkers(true);
  },

  /**
   * 清空搜索
   */
  onClearSearch() {
    this.setData({ searchKeyword: '' });
    this.loadWorkers(true);
  },

  /**
   * 设置筛选值
   */
  setFilterValue(key, value) {
    const { filterConfig } = this.data;
    const index = filterConfig.findIndex(f => f.key === key);
    
    if (index !== -1) {
      const filter = filterConfig[index];
      const option = filter.options.find(opt => opt.value === value);
      
      const newConfig = [...filterConfig];
      newConfig[index] = {
        ...filter,
        value,
        selectedLabel: option ? option.label : value
      };
      
      this.setData({ filterConfig: newConfig });
      
      // 更新筛选条件
      this.setData({
        [`filters.${key}`]: value
      });
    }
  },

  /**
   * 筛选变化
   */
  onFilterChange(e) {
    const { key, value } = e.detail;
    this.setData({
      [`filters.${key}`]: value,
      scrollTop: 0
    });
    this.loadWorkers(true);
  },

  /**
   * 滚动监听
   */
  onScroll(e) {
    // 记录滚动位置
    this.setData({
      scrollTop: e.detail.scrollTop
    });
  },

  /**
   * 筛选重置
   */
  onFilterReset(e) {
    const { key } = e.detail;
    this.setData({
      [`filters.${key}`]: ''
    });
    this.loadWorkers(true);
  },

  /**
   * 筛选确认
   */
  onFilterConfirm(e) {
    this.loadWorkers(true);
  },

  /**
   * 下拉刷新
   */
  onRefresh() {
    console.log('阿姨页面下拉刷新触发');
    
    // 防止重复触发
    if (this.data.isRefreshing) {
      console.log('已经在刷新中，忽略');
      return;
    }
    
    this.setData({ isRefreshing: true });
    
    // 设置超时保护，防止刷新状态卡住
    const refreshTimeout = setTimeout(() => {
      if (this.data.isRefreshing) {
        console.log('刷新超时，强制关闭刷新状态');
        this.setData({ isRefreshing: false });
      }
    }, 5000);
    
    this.loadWorkers(true, () => {
      clearTimeout(refreshTimeout);
      this.setData({ isRefreshing: false });
      console.log('阿姨页面下拉刷新完成');
    });
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (this.data.isLoading || !this.data.hasMore) return;
    this.loadWorkers(false);
  },

  /**
   * 加载阿姨列表
   */
  loadWorkers(reset = false, callback) {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    const page = reset ? 1 : this.data.page;
    const { searchKeyword, filters, pageSize } = this.data;
    
    // 解析价格范围
    let minPrice, maxPrice;
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split('-').map(Number);
      minPrice = min;
      maxPrice = max;
    }
    
    // 调用云函数
    app.callCloudFunction('worker', 'getList', {
      type: filters.type || '',
      keyword: searchKeyword,
      minPrice,
      maxPrice,
      minExperience: filters.experience ? parseInt(filters.experience) : undefined,
      page,
      limit: pageSize
    })
    .then((res) => {
      let list = res.data.list || [];
      
      // 本地搜索过滤（云函数未支持搜索时使用）
      if (searchKeyword && list.length > 0) {
        const keyword = searchKeyword.toLowerCase();
        list = list.filter(worker => {
          const nameMatch = worker.name && worker.name.toLowerCase().includes(keyword);
          const skillMatch = worker.skills && worker.skills.some(s => s.toLowerCase().includes(keyword));
          return nameMatch || skillMatch;
        });
      }
      
      this.setData({
        workers: reset ? list : [...this.data.workers, ...list],
        page: page + 1,
        hasMore: list.length >= pageSize,
        isLoading: false
      });
      
      if (callback) callback();
    })
    .catch((err) => {
      console.error('加载阿姨列表失败:', err);
      // 云函数未部署时使用本地数据
      let localWorkers = this.getLocalWorkers();
      
      // 本地搜索过滤
      if (searchKeyword) {
        const keyword = searchKeyword.toLowerCase();
        localWorkers = localWorkers.filter(worker => {
          const nameMatch = worker.name.toLowerCase().includes(keyword);
          const skillMatch = worker.skills && worker.skills.some(s => s.toLowerCase().includes(keyword));
          return nameMatch || skillMatch;
        });
      }
      
      // 本地筛选过滤 - 服务类型
      if (filters.type) {
        localWorkers = localWorkers.filter(worker => {
          return worker.serviceTypes && worker.serviceTypes.includes(filters.type);
        });
      }
      
      // 本地筛选过滤 - 价格范围
      if (filters.priceRange) {
        const [min, max] = filters.priceRange.split('-').map(Number);
        localWorkers = localWorkers.filter(worker => {
          const monthlyPrice = worker.price && worker.price.monthly ? worker.price.monthly : worker.price;
          return monthlyPrice >= min && monthlyPrice <= max;
        });
      }
      
      // 本地筛选过滤 - 经验
      if (filters.experience) {
        const minExp = parseInt(filters.experience);
        localWorkers = localWorkers.filter(worker => {
          if (minExp === 0) {
            return worker.experience < 1;
          } else if (minExp === 1) {
            return worker.experience >= 1 && worker.experience < 3;
          } else if (minExp === 3) {
            return worker.experience >= 3 && worker.experience < 5;
          } else if (minExp === 5) {
            return worker.experience >= 5;
          }
          return true;
        });
      }
      
      this.setData({
        workers: reset ? localWorkers : [...this.data.workers, ...localWorkers],
        page: page + 1,
        hasMore: false,
        isLoading: false
      });
      if (callback) callback();
    });
  },

  /**
   * 获取本地阿姨数据
   */
  getLocalWorkers() {
    return [
      {
        _id: 'w001',
        name: '王秀芳',
        avatar: '/images/worker-1.jpg',
        age: 45,
        hometown: '安徽合肥',
        experience: 8,
        serviceTypes: ['babysitter', 'nanny'],
        price: { daily: 280, monthly: 7500 },
        skills: ['婴儿护理', '辅食制作', '早教启蒙', '家务清洁'],
        rating: 4.9,
        reviewCount: 128
      },
      {
        _id: 'w002',
        name: '李桂英',
        avatar: '/images/worker-2.jpg',
        age: 52,
        hometown: '江苏南京',
        experience: 12,
        serviceTypes: ['maternity', 'babysitter'],
        price: { daily: 350, monthly: 9800 },
        skills: ['产妇护理', '新生儿护理', '月子餐', '催乳'],
        rating: 5.0,
        reviewCount: 89
      },
      {
        _id: 'w003',
        name: '张美华',
        avatar: '/images/worker-3.jpg',
        age: 38,
        hometown: '浙江杭州',
        experience: 5,
        serviceTypes: ['nanny'],
        price: { daily: 220, monthly: 6000 },
        skills: ['家务清洁', '烹饪', '接送孩子', '陪伴老人'],
        rating: 4.7,
        reviewCount: 56
      },
      {
        _id: 'w004',
        name: '陈雅琴',
        avatar: '/images/worker-4.jpg',
        age: 48,
        hometown: '四川成都',
        experience: 10,
        serviceTypes: ['babysitter', 'nanny'],
        price: { daily: 300, monthly: 8000 },
        skills: ['婴儿护理', '早教', '辅食制作', '家务清洁', '烹饪'],
        rating: 4.8,
        reviewCount: 95
      },
      {
        _id: 'w005',
        name: '刘小红',
        avatar: '/images/worker-5.jpg',
        age: 42,
        hometown: '湖南长沙',
        experience: 6,
        serviceTypes: ['maternity'],
        price: { daily: 380, monthly: 10800 },
        skills: ['产妇护理', '新生儿护理', '月子餐', '产后恢复'],
        rating: 4.9,
        reviewCount: 67
      },
      {
        _id: 'w006',
        name: '赵淑芬',
        avatar: '/images/default-avatar.png',
        age: 55,
        hometown: '山东青岛',
        experience: 15,
        serviceTypes: ['nanny'],
        price: { daily: 250, monthly: 6800 },
        skills: ['家务清洁', '烹饪', '照顾老人', '收纳整理'],
        rating: 4.6,
        reviewCount: 112
      }
    ];
  },

  /**
   * 点击阿姨卡片
   */
  onWorkerTap(e) {
    const { workerId } = e.detail;
    wx.navigateTo({
      url: `/packageA/pages/worker-detail/worker-detail?id=${workerId}`
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
   * 收藏阿姨
   */
  onFavoriteTap(e) {
    // 检查登录状态
    if (!app.globalData.isLogin) {
      this.showLoginModal('收藏阿姨');
      return;
    }
    
    const { workerId } = e.detail;
    
    app.callCloudFunction('worker', 'addFavorite', { workerId })
      .then(() => {
        app.showToast('收藏成功', 'success');
      })
      .catch((err) => {
        app.showToast(err.message || '收藏失败');
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
            
            // 云函数失败时使用本地模拟登录
            if (err.message && (err.message.includes('云函数未正确部署') || err.message.includes('云函数返回格式错误'))) {
              console.log('使用本地模拟登录');
              this.mockLogin(userInfo);
            } else {
              wx.showToast({
                title: err.message || '登录失败，请重试',
                icon: 'none'
              });
            }
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
   * 本地模拟登录（云函数未部署时使用）
   */
  mockLogin(userInfo) {
    const mockUserInfo = {
      _id: 'mock_user_' + Date.now(),
      nickname: userInfo ? userInfo.nickName : '微信用户',
      avatar: userInfo ? userInfo.avatarUrl : '/images/default-avatar.png',
      phone: '',
      role: 'user',
      workerId: null
    };
    
    app.globalData.userInfo = mockUserInfo;
    app.globalData.isLogin = true;
    wx.setStorageSync('userInfo', mockUserInfo);
    
    wx.showToast({
      title: '登录成功',
      icon: 'success'
    });
  }
});
