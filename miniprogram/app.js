/**
 * 应用入口文件
 * 爱心家政 - 保姆/育儿嫂中介小程序（云开发版）
 */

App({
  // 全局数据
  globalData: {
    userInfo: null,
    systemInfo: null,
    isLogin: false,
    openid: null
  },

  /**
   * 小程序初始化
   */
  onLaunch() {
    console.log('小程序启动');
    
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      try {
        wx.cloud.init({
          env: 'cloud1-9gb9q6d09a380783',
          traceUser: true
        });
        console.log('云开发初始化成功');
      } catch (e) {
        console.error('云开发初始化失败:', e);
      }
    }
    
    // 获取系统信息
    this.getSystemInfo();
    
    // 检查登录状态
    this.checkLoginStatus();
  },

  /**
   * 获取系统信息
   */
  getSystemInfo() {
    try {
      const systemInfo = {
        windowInfo: wx.getWindowInfo(),
        deviceInfo: wx.getDeviceInfo(),
        appBaseInfo: wx.getAppBaseInfo(),
        appAuthorizeSetting: wx.getAppAuthorizeSetting()
      };
      this.globalData.systemInfo = systemInfo;
      console.log('系统信息:', systemInfo);
    } catch (e) {
      // 兼容旧版本
      wx.getSystemInfo({
        success: (res) => {
          this.globalData.systemInfo = res;
          console.log('系统信息:', res);
        }
      });
    }
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus() {
    // 云开发自动处理登录，这里检查本地存储
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLogin = true;
    }
  },

  /**
   * 调用云函数
   * @param {string} name - 云函数名称
   * @param {string} action - 操作名称
   * @param {object} data - 请求数据
   */
  callCloudFunction(name, action, data = {}) {
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name,
        data: {
          action,
          data
        },
        success: (res) => {
          console.log(`云函数 ${name}.${action} 返回:`, res.result);
          // 检查返回格式
          if (res.result && res.result.success === true) {
            resolve(res.result);
          } else if (res.result && res.result.success === false) {
            const errorMsg = res.result.message || res.result.error || '调用失败';
            console.error(`云函数返回错误:`, errorMsg);
            reject(new Error(errorMsg));
          } else if (res.result && res.result.action && !res.result.hasOwnProperty('success')) {
            // 云函数返回了 event 对象，说明云函数没有正确处理
            console.error(`云函数 ${name} 未正确部署，返回了原始事件对象`);
            reject(new Error('云函数未正确部署，请重新部署云函数'));
          } else {
            // 云函数未部署或返回格式不正确
            console.error(`云函数返回格式错误:`, res.result);
            reject(new Error('云函数返回格式错误，请检查云函数日志'));
          }
        },
        fail: (err) => {
          console.error(`云函数 ${name}.${action} 调用失败:`, err);
          reject(err);
        }
      });
    });
  },

  /**
   * 用户登录
   */
  login() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (userRes) => {
          const userInfo = userRes.userInfo;
          
          // 调用登录云函数
          this.callCloudFunction('user', 'login', userInfo)
            .then((result) => {
              this.globalData.userInfo = result.data.userInfo;
              this.globalData.isLogin = true;
              wx.setStorageSync('userInfo', result.data.userInfo);
              resolve(result);
            })
            .catch(reject);
        },
        fail: reject
      });
    });
  },

  /**
   * 获取用户信息
   */
  getUserInfo() {
    return new Promise((resolve, reject) => {
      this.callCloudFunction('user', 'getProfile')
        .then((result) => {
          this.globalData.userInfo = result.data;
          resolve(result);
        })
        .catch(reject);
    });
  },

  /**
   * 全局提示方法
   */
  showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    });
  },

  /**
   * 全局加载提示
   */
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  /**
   * 隐藏加载提示
   */
  hideLoading() {
    wx.hideLoading();
  },

  /**
   * 确认对话框
   */
  showModal(title, content) {
    return new Promise((resolve) => {
      wx.showModal({
        title,
        content,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  },

  /**
   * 统一联系客服弹窗
   * @param {object} options
   * @param {string} options.phoneNumber - 客服电话
   * @param {string} options.title - 弹窗标题
   * @param {string} options.content - 弹窗文案
   * @param {string} options.confirmText - 确认按钮文案
   */
  contactService(options = {}) {
    const phoneNumber = options.phoneNumber || '13581711930';
    const title = options.title || '联系客服';
    const content = options.content || `客服电话：${phoneNumber}\n工作时间：9:00-18:00\n如有任何问题，请随时联系我们！`;
    const confirmText = options.confirmText || '拨打';

    wx.showModal({
      title,
      content,
      confirmText,
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({ phoneNumber });
        }
      }
    });
  },

  /**
   * 上传图片到云存储
   * @param {string} filePath - 本地文件路径
   * @param {string} cloudPath - 云端路径
   */
  uploadImage(filePath, cloudPath) {
    return new Promise((resolve, reject) => {
      wx.cloud.uploadFile({
        cloudPath,
        filePath,
        success: (res) => {
          resolve(res.fileID);
        },
        fail: reject
      });
    });
  }
});
