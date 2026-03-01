/**
 * 个人中心页面
 * 用户信息展示和功能入口
 */
const app = getApp();
const { PROFILE_ORDER_STATUS_TAB_INDEX } = require('../../utils/constants');
const { getRoleFlagsByRole, getRoleFlagsByUser } = require('../../utils/role');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 登录状态
    isLogin: false,
    isWorker: false,
    isPlatform: false,
    workerInfo: null,
    
    // 用户信息
    userInfo: {
      avatarUrl: '',
      nickName: '',
      phone: ''
    },
    nameInputFocus: false,
    
    // 订单统计
    orderStats: {
      all: 0,
      pending: 0,
      serving: 0,
      completed: 0
    }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 1
      });
    }
    
    // 刷新数据
    if (this.data.isLogin) {
      this.loadUserInfo();
      this.loadOrderStats();
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    const userInfo = app.globalData.userInfo;
    const roleFlags = getRoleFlagsByUser(userInfo);
    
    this.setData({
      isLogin: app.globalData.isLogin,
      isPlatform: roleFlags.isPlatform,
      isWorker: roleFlags.isWorker,
      userInfo: {
        avatarUrl: userInfo && userInfo.avatar ? userInfo.avatar : '',
        nickName: userInfo && userInfo.nickname ? userInfo.nickname : '',
        phone: userInfo && userInfo.phone ? userInfo.phone : ''
      }
    });

    if (app.globalData.isLogin) {
      this.loadUserInfo();
    }
    
    // 加载订单统计（无论是否登录都显示）
    this.loadOrderStats();
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    app.callCloudFunction('user', 'getProfile')
      .then((res) => {
        const userData = res.data;
        const roleFlags = getRoleFlagsByRole(userData.role);
        this.setData({
          isWorker: roleFlags.isWorker,
          isPlatform: roleFlags.isPlatform,
          workerInfo: userData.workerInfo,
          userInfo: {
            avatarUrl: userData.avatar,
            nickName: userData.nickname,
            phone: userData.phone || ''
          }
        });
      })
      .catch((err) => {
        console.error('获取用户信息失败:', err);
      });
  },

  /**
   * 加载订单统计
   */
  loadOrderStats() {
    // 未登录时显示0
    if (!this.data.isLogin) {
      this.setData({
        orderStats: {
          all: 0,
          pending: 0,
          serving: 0,
          completed: 0
        }
      });
      return;
    }
    
    // 调用云函数获取订单统计
    app.callCloudFunction('order', 'getStats', {})
      .then((res) => {
        const stats = res.data || {};
        this.setData({
          orderStats: {
            all: stats.all || 0,
            pending: stats.pending || 0,
            serving: stats.serving || 0,
            completed: stats.completed || 0
          }
        });
      })
      .catch((err) => {
        console.error('获取订单统计失败:', err);
        this.setData({
          orderStats: {
            all: 0,
            pending: 0,
            serving: 0,
            completed: 0
          }
        });
      });
  },

  /**
   * 登录 - 获取微信用户信息后登录
   */
  onLogin() {
    wx.showLoading({ title: '登录中...' });
    
    // 获取微信用户信息
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (userRes) => {
        const userInfo = userRes.userInfo;
        const nickName = (userInfo && userInfo.nickName) || '';
        const avatarUrl = (userInfo && userInfo.avatarUrl) || '/images/default-avatar.png';
        
        // 调用云函数登录，传入微信头像和昵称
        const loginData = {
          nickName,
          avatarUrl
        };
        
        app.callCloudFunction('user', 'login', loginData)
          .then((loginRes) => {
            wx.hideLoading();
            
            const data = loginRes.data;
            const roleFlags = getRoleFlagsByRole(data.userInfo.role);
            
            app.globalData.userInfo = data.userInfo;
            app.globalData.isLogin = true;
            wx.setStorageSync('userInfo', data.userInfo);
            
            this.setData({
              isLogin: true,
              isWorker: roleFlags.isWorker,
              isPlatform: roleFlags.isPlatform,
              workerInfo: data.workerInfo,
              userInfo: {
                avatarUrl: data.userInfo.avatar,
                nickName: data.userInfo.nickname,
                phone: data.userInfo.phone || ''
              }
            });
            
            // 登录成功后加载订单统计
            this.loadOrderStats();
            
            wx.showToast({
              title: '登录成功',
              icon: 'success'
            });

            // 新版微信可能不会直接返回真实头像昵称，登录后引导补全
            const isDefaultName = !data.userInfo.nickname || data.userInfo.nickname === '微信用户';
            const isDefaultAvatar = !data.userInfo.avatar || data.userInfo.avatar === '/images/default-avatar.png';
            if (isDefaultName || isDefaultAvatar) {
              setTimeout(() => {
                wx.showModal({
                  title: '完善资料',
                  content: '请点击头像选择微信头像，并在昵称输入框填写昵称，以同步真实微信资料。',
                  showCancel: false,
                  confirmText: '我知道了'
                });
              }, 400);
            }
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
   * 选择头像
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    
    // 上传头像到云存储
    wx.cloud.uploadFile({
      cloudPath: `avatars/user_${Date.now()}.jpg`,
      filePath: avatarUrl,
      success: (uploadRes) => {
        // 更新用户信息
        app.callCloudFunction('user', 'updateProfile', {
          avatar: uploadRes.fileID
        })
        .then(() => {
          this.setData({
            'userInfo.avatarUrl': uploadRes.fileID
          });
          app.globalData.userInfo.avatar = uploadRes.fileID;
          wx.setStorageSync('userInfo', app.globalData.userInfo);
          app.showToast('头像已更新', 'success');
        })
        .catch((err) => {
          app.showToast('更新失败');
        });
      },
      fail: () => {
        app.showToast('上传失败');
      }
    });
  },

  /**
   * 修改昵称
   */
  onNicknameChange(e) {
    const detail = e && e.detail ? e.detail : {};
    const nickName = ((detail.value || detail.nickname || '') + '').trim();
    if (!nickName) return;
    if (nickName === (this.data.userInfo.nickName || '').trim()) return;
    
    app.callCloudFunction('user', 'updateProfile', {
      nickname: nickName
    })
    .then(() => {
      this.setData({
        'userInfo.nickName': nickName
      });
      if (app.globalData.userInfo) {
        app.globalData.userInfo.nickname = nickName;
        wx.setStorageSync('userInfo', app.globalData.userInfo);
      }
      app.showToast('昵称已更新', 'success');
    })
    .catch((err) => {
      app.showToast('更新失败');
    });
  },

  onNameEditTap() {
    this.setData({
      nameInputFocus: true
    });
  },

  onNameInputBlur() {
    this.onNicknameChange.apply(this, arguments);
    if (this.data.nameInputFocus) {
      this.setData({
        nameInputFocus: false
      });
    }
  },

  onBindPhone(e) {
    console.log('onBindPhone called, event:', e);
    if (!this.data.isLogin) {
      app.showToast('请先登录');
      return;
    }

    const detail = e && e.detail ? e.detail : {};
    if (detail.errMsg !== 'getPhoneNumber:ok') {
      // handle explicit denial or missing permission
      const msg = detail.errMsg || '';
      if (msg.indexOf('no permission') !== -1) {
        wx.showModal({
          title: '没有获取手机号权限',
          content: '请在微信设置中开启“获取手机号”权限后再绑定。',
          confirmText: '去设置',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        wx.showModal({
          title: '需要手机号授权',
          content: '未授权手机号将无法完成绑定。请点击“绑定”并允许微信手机号授权。',
          confirmText: '重新授权',
          cancelText: '稍后再说',
          success: (res) => {
            if (res.confirm) {
              app.showToast('请再次点击“绑定”完成授权');
            }
          }
        });
      }
      return;
    }

    const { encryptedData, iv } = detail;
    if (!encryptedData || !iv) {
      app.showToast('未获取到加密数据，绑定失败');
      return;
    }

    // wx.getPhoneNumber 不会返回登录 code；需要先调用 wx.login 获取 code 并一并发送给后端由后端用 session_key 解密
    wx.login({
      success: (loginRes) => {
        const code = loginRes && loginRes.code ? loginRes.code : '';
        if (!code) {
          app.showToast('获取登录凭证失败，请重试');
          return;
        }

        app.callCloudFunction('user', 'bindPhone', { code, encryptedData, iv })
          .then((res) => {
            const phone = res && res.data && res.data.phone ? res.data.phone : '';
            if (!phone) {
              app.showToast('绑定失败');
              return;
            }

            this.setData({
              'userInfo.phone': phone
            });

            if (app.globalData.userInfo) {
              app.globalData.userInfo.phone = phone;
              wx.setStorageSync('userInfo', app.globalData.userInfo);
            }

            app.showToast('手机号已绑定', 'success');
          })
          .catch((err) => {
            app.showToast(err.message || '绑定失败');
          });
      },
      fail: () => {
        app.showToast('获取登录凭证失败，请重试');
      }
    });
  },

  /**
   * 点击订单统计
   */
  onOrderTap(e) {
    const { status } = e.currentTarget.dataset;
    
    // 未登录时弹出登录弹框
    if (!this.data.isLogin) {
      wx.showModal({
        title: '提示',
        content: '请先登录后查看订单',
        confirmText: '去登录',
        success: (res) => {
          if (res.confirm) {
            // 执行登录
            this.onLogin();
          }
        }
      });
      return;
    }
    
    // 映射状态到订单页面的tab索引
    const tabIndex = PROFILE_ORDER_STATUS_TAB_INDEX[status] || 0;
    
    wx.navigateTo({
      url: `/pages/orders/orders?tabIndex=${tabIndex}`
    });
  },

  /**
   * 点击菜单项
   */
  onMenuTap(e) {
    const { page } = e.currentTarget.dataset;
    
    switch (page) {

      case 'favorites':
        if (!this.data.isLogin) {
          app.showToast('请先登录');
          return;
        }
        if (this.data.isWorker || this.data.isPlatform) {
          app.showToast('仅雇主可使用收藏');
          return;
        }
        wx.navigateTo({
          url: '/packageB/pages/favorites/favorites'
        });
        break;
      case 'bookings':
        if (!this.data.isLogin) {
          app.showToast('请先登录');
          return;
        }
        wx.navigateTo({
          url: '/packageB/pages/bookings/bookings'
        });
        break;
      case 'address':
        app.showToast('功能开发中');
        break;
      case 'workerSettings':
        if (!this.data.isLogin || !this.data.isWorker) {
          app.showToast('仅阿姨可访问');
          return;
        }
        wx.navigateTo({
          url: '/packageA/pages/worker-settings/worker-settings'
        });
        break;
      case 'rulesTraining':
        if (!this.data.isLogin || !this.data.isWorker) {
          app.showToast('仅阿姨可访问');
          return;
        }
        wx.navigateTo({
          url: '/packageC/pages/rules-training/rules-training'
        });
        break;
      case 'interviewAdmin':
        if (!this.data.isLogin) {
          app.showToast('请先登录');
          return;
        }
        if (!this.data.isPlatform) {
          app.showToast('仅平台管理员可访问');
          return;
        }
        wx.navigateTo({
          url: '/packageC/pages/interview-admin/interview-admin'
        });
        break;
      case 'contact':
        this.handleContact();
        break;
      case 'subscribeNotify':
        this.onSubscribeNotify();
        break;
      case 'feedback':
        app.showToast('功能开发中');
        break;
      case 'about':
        app.showToast('功能开发中');
        break;
      case 'settings':
        app.showToast('功能开发中');
        break;
    }
  },

  /**
   * 联系客服
   */
  handleContact() {
    app.contactService();
  },

  onSubscribeNotify() {
    app.requestSubscribeNotifications({ showToast: true });
  },

  /**
   * 注册为阿姨
   */
  onRegisterWorker() {
    if (!this.data.isLogin) {
      app.showToast('请先登录');
      return;
    }
    if (this.data.isPlatform) {
      app.showToast('平台管理员不可注册为阿姨');
      return;
    }
    
    wx.navigateTo({
      url: '/packageA/pages/worker-register/worker-register'
    });
  },

  /**
   * 退出登录
   */
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          app.globalData.userInfo = null;
          app.globalData.isLogin = false;
          
          this.setData({
            isLogin: false,
            isWorker: false,
            isPlatform: false,
            workerInfo: null,
            userInfo: {
              avatarUrl: '',
              nickName: '',
              phone: ''
            }
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
});
