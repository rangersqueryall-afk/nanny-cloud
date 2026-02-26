/**
 * 阿姨详情页
 * 展示阿姨的详细信息、工作经历、用户评价
 */
const app = getApp();
const SERVICE_TYPE_MAP = {
  babysitter: '保姆',
  nanny: '育儿嫂',
  maternity: '月嫂',
  elderly: '护老'
};

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
        console.error('加载阿姨详情失败，使用本地数据:', err);
        const localWorker = this.getLocalWorkerDetail(id);
        if (!localWorker) {
          wx.showToast({
            title: '阿姨信息不存在',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1200);
          return;
        }

        this.setData({
          worker: localWorker,
          isLoading: false
        });
        wx.setNavigationBarTitle({
          title: localWorker.name
        });
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
      serviceTypesText: worker.serviceTypesText || serviceTypes.map(type => SERVICE_TYPE_MAP[type] || type),
      avatar: worker.avatar || '/images/default-avatar.png',
      isVerified: worker.isVerified !== false,
      introduction: worker.introduction || worker.bio || '暂无简介',
      experiences: worker.experiences || []
    };
  },

  getLocalWorkerDetail(id) {
    const localWorkers = [
      {
        _id: 'w001',
        name: '王秀芳',
        age: 45,
        hometown: '安徽合肥',
        experience: 8,
        price: { daily: 280, monthly: 7500 },
        hourlyPrice: 50,
        rating: 4.9,
        orderCount: 128,
        reviewCount: 128,
        skills: ['婴儿护理', '辅食制作', '早教启蒙', '家务清洁'],
        serviceTypes: ['babysitter', 'nanny'],
        avatar: '/images/worker-1.jpg',
        isVerified: true,
        introduction: '从事家政服务行业8年，擅长婴幼儿护理、辅食制作和家庭整理。',
        experiences: [
          { title: '住家保姆', period: '2020.03 - 至今', description: '负责三口之家家务及3岁宝宝照护。' },
          { title: '育儿嫂', period: '2018.06 - 2020.02', description: '负责新生儿喂养、洗护与作息培养。' }
        ]
      },
      {
        _id: 'w002',
        name: '李桂英',
        age: 52,
        hometown: '江苏南京',
        experience: 12,
        price: { daily: 350, monthly: 9800 },
        hourlyPrice: 65,
        rating: 5.0,
        orderCount: 96,
        reviewCount: 89,
        skills: ['产妇护理', '新生儿护理', '月子餐', '催乳'],
        serviceTypes: ['maternity', 'babysitter'],
        avatar: '/images/worker-2.jpg',
        isVerified: true,
        introduction: '12年月嫂经验，注重科学护理与饮食调理，服务口碑稳定。',
        experiences: [
          { title: '高级月嫂', period: '2019.01 - 至今', description: '主要负责月子期产妇和新生儿护理。' },
          { title: '母婴护理师', period: '2013.05 - 2018.12', description: '在母婴机构提供住家及到家服务。' }
        ]
      },
      {
        _id: 'w003',
        name: '张美华',
        age: 38,
        hometown: '浙江杭州',
        experience: 5,
        price: { daily: 220, monthly: 6000 },
        hourlyPrice: 45,
        rating: 4.7,
        orderCount: 62,
        reviewCount: 56,
        skills: ['家务清洁', '烹饪', '接送孩子', '陪伴老人'],
        serviceTypes: ['nanny'],
        avatar: '/images/worker-3.jpg',
        isVerified: true,
        introduction: '擅长家庭清洁收纳和三餐安排，做事细致，沟通顺畅。',
        experiences: [
          { title: '白班保姆', period: '2021.02 - 至今', description: '负责家庭家务、采购与孩子接送。' }
        ]
      },
      {
        _id: 'w004',
        name: '陈雅琴',
        age: 48,
        hometown: '四川成都',
        experience: 10,
        price: { daily: 300, monthly: 8000 },
        hourlyPrice: 55,
        rating: 4.8,
        orderCount: 110,
        reviewCount: 95,
        skills: ['婴儿护理', '早教', '辅食制作', '家务清洁', '烹饪'],
        serviceTypes: ['babysitter', 'nanny'],
        avatar: '/images/worker-4.jpg',
        isVerified: true,
        introduction: '10年育儿与家务服务经验，擅长幼儿早教互动与膳食搭配。',
        experiences: [
          { title: '育儿嫂', period: '2018.07 - 至今', description: '负责0-3岁幼儿照护与早教陪伴。' }
        ]
      },
      {
        _id: 'w005',
        name: '刘小红',
        age: 42,
        hometown: '湖南长沙',
        experience: 6,
        price: { daily: 380, monthly: 10800 },
        hourlyPrice: 70,
        rating: 4.9,
        orderCount: 72,
        reviewCount: 67,
        skills: ['产妇护理', '新生儿护理', '月子餐', '产后恢复'],
        serviceTypes: ['maternity'],
        avatar: '/images/worker-5.jpg',
        isVerified: true,
        introduction: '专注母婴护理与产后恢复，服务流程规范，执行力强。',
        experiences: [
          { title: '住家月嫂', period: '2020.09 - 至今', description: '提供新生儿护理、母乳指导和恢复支持。' }
        ]
      },
      {
        _id: 'w006',
        name: '赵淑芬',
        age: 55,
        hometown: '山东青岛',
        experience: 15,
        price: { daily: 250, monthly: 6800 },
        hourlyPrice: 48,
        rating: 4.6,
        orderCount: 130,
        reviewCount: 112,
        skills: ['家务清洁', '烹饪', '照顾老人', '收纳整理'],
        serviceTypes: ['nanny'],
        avatar: '/images/default-avatar.png',
        isVerified: true,
        introduction: '长期从事家政与老人照护工作，节奏稳定，责任心强。',
        experiences: [
          { title: '护老保姆', period: '2016.04 - 至今', description: '负责老人日常照护与家庭饮食安排。' }
        ]
      }
    ];

    const worker = localWorkers.find(item => item._id === id || String(item.id) === String(id));
    if (!worker) return null;
    return this.normalizeWorkerData(worker, id);
  },

  /**
   * 加载用户评价
   */
  loadReviews(id) {
    // 模拟API请求
    setTimeout(() => {
      const mockReviews = [
        {
          id: 1,
          userName: '张女士',
          userAvatar: 'https://i.pravatar.cc/150?img=10',
          rating: 5,
          date: '2024-01-15',
          content: '王阿姨非常专业，做事认真负责，做的饭菜很好吃，宝宝也很喜欢她。强烈推荐！',
          tags: ['专业', '认真负责', '做饭好吃']
        },
        {
          id: 2,
          userName: '李先生',
          userAvatar: 'https://i.pravatar.cc/150?img=11',
          rating: 5,
          date: '2024-01-10',
          content: '王阿姨在我们家工作了一年多，非常负责任，家务做得井井有条，对老人也很有耐心。',
          tags: ['负责任', '有耐心']
        },
        {
          id: 3,
          userName: '王女士',
          userAvatar: 'https://i.pravatar.cc/150?img=12',
          rating: 4,
          date: '2024-01-05',
          content: '总体来说不错，就是有时候沟通需要再多一点。',
          tags: ['总体不错']
        }
      ];
      
      this.setData({
        reviews: mockReviews
      });
    }, 800);
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
        console.error('检查收藏状态失败，使用本地兜底:', err);
        const collectList = wx.getStorageSync('collectList') || [];
        const isCollected = collectList.some(item => String(item.id) === String(id));
        this.setData({ isCollected });
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
        console.error('收藏操作失败，使用本地兜底:', err);
        let collectList = wx.getStorageSync('collectList') || [];
        if (isCollected) {
          collectList = collectList.filter(item => String(item.id) !== String(workerIdValue));
        } else {
          collectList.push({
            id: workerIdValue,
            name: worker.name,
            avatar: worker.avatar,
            price: worker.price,
            addTime: Date.now()
          });
        }
        wx.setStorageSync('collectList', collectList);
        this.setData({ isCollected: !isCollected });
        wx.showToast({
          title: isCollected ? '已取消收藏' : '收藏成功',
          icon: isCollected ? 'none' : 'success'
        });
      });
  },

  /**
   * 点击咨询
   */
  onContact() {
    wx.showModal({
      title: '联系客服',
      content: '客服电话：400-888-8888',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '4008888888'
          });
        }
      }
    });
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
