/**
 * 预约页面
 * 用户预约阿姨服务
 */
const app = getApp();
const { isValidPhone, formatDate } = require('../../../utils/util');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 阿姨信息
    worker: {},
    workerId: null,
    
    // 服务类型
    serviceTypes: [
      { id: 'livein', name: '住家服务', desc: '24小时住家', price: 1 },
      { id: 'daytime', name: '白班服务', desc: '白天工作', price: 0.8 },
      { id: 'temporary', name: '临时服务', desc: '按小时计费', price: 0 }
    ],
    selectedServiceType: 'livein',
    
    // 服务时间
    startDate: '',
    minDate: '',
    durationOptions: ['1个月', '3个月', '6个月', '12个月', '24个月'],
    durationIndex: -1,
    dailyHoursOptions: ['2小时', '4小时', '6小时', '8小时'],
    dailyHoursIndex: -1,
    
    // 联系信息
    contactName: '',
    contactPhone: '',
    address: '',
    
    // 特殊需求
    remark: '',
    
    // 价格计算
    servicePrice: 0,
    hourlyPrice: 50,
    totalDays: 1,
    totalPrice: 0,
    
    // 提交状态
    isSubmitting: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { workerId } = options;
    
    if (!workerId) {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }
    
    this.setData({ workerId });
    
    // 加载阿姨信息
    this.loadWorkerInfo(workerId);
    
    // 设置最小日期为今天
    const today = new Date();
    const minDate = formatDate(today, 'YYYY-MM-DD');
    this.setData({ minDate });
    
    // 尝试获取用户信息填充
    this.fillUserInfo();
  },

  /**
   * 加载阿姨信息
   */
  loadWorkerInfo(id) {
    app.callCloudFunction('worker', 'getDetail', { id })
      .then((res) => {
        const worker = res.data || {};
        const monthly = worker.price && worker.price.monthly ? worker.price.monthly : 0;
        this.setData({
          worker: {
            id: worker._id || id,
            name: worker.name || '阿姨',
            age: worker.age || 0,
            experience: worker.experience || 0,
            price: monthly,
            avatar: worker.avatar || '/images/default-avatar.png',
            serviceTypes: Array.isArray(worker.serviceTypes) ? worker.serviceTypes : []
          }
        }, () => {
          this.calculatePrice();
        });
      })
      .catch((err) => {
        wx.showToast({
          title: err.message || '加载阿姨信息失败',
          icon: 'none'
        });
      });
  },

  /**
   * 填充用户信息
   */
  fillUserInfo() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        contactName: userInfo.nickName || '',
        contactPhone: userInfo.phone || ''
      });
    }
  },

  /**
   * 选择服务类型
   */
  onSelectServiceType(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      selectedServiceType: id
    }, () => {
      this.calculatePrice();
    });
  },

  /**
   * 选择开始日期
   */
  onStartDateChange(e) {
    this.setData({
      startDate: e.detail.value
    }, () => {
      this.calculatePrice();
    });
  },

  /**
   * 选择服务时长
   */
  onDurationChange(e) {
    this.setData({
      durationIndex: parseInt(e.detail.value)
    }, () => {
      this.calculatePrice();
    });
  },

  /**
   * 选择每日时长
   */
  onDailyHoursChange(e) {
    this.setData({
      dailyHoursIndex: parseInt(e.detail.value)
    }, () => {
      this.calculatePrice();
    });
  },

  /**
   * 输入联系人
   */
  onContactNameInput(e) {
    this.setData({
      contactName: e.detail.value
    });
  },

  /**
   * 输入联系电话
   */
  onContactPhoneInput(e) {
    this.setData({
      contactPhone: e.detail.value
    });
  },

  /**
   * 输入地址
   */
  onAddressInput(e) {
    this.setData({
      address: e.detail.value
    });
  },

  /**
   * 输入备注
   */
  onRemarkInput(e) {
    this.setData({
      remark: e.detail.value
    });
  },

  /**
   * 计算价格
   */
  calculatePrice() {
    const { worker, selectedServiceType, durationIndex, dailyHoursIndex } = this.data;
    
    if (!worker.price) return;
    
    let servicePrice = worker.price;
    let totalPrice = 0;
    let totalDays = 30;
    
    // 根据服务类型计算
    const serviceType = this.data.serviceTypes.find(t => t.id === selectedServiceType);
    
    if (selectedServiceType === 'livein') {
      // 住家服务
      servicePrice = worker.price;
    } else if (selectedServiceType === 'daytime') {
      // 白班服务
      servicePrice = Math.floor(worker.price * 0.8);
    } else if (selectedServiceType === 'temporary') {
      // 临时服务按小时计费
      const hours = [2, 4, 6, 8];
      const selectedHours = dailyHoursIndex >= 0 ? hours[dailyHoursIndex] : 2;
      servicePrice = this.data.hourlyPrice * selectedHours;
    }
    
    // 根据时长计算
    const durations = [1, 3, 6, 12];
    const selectedDuration = durationIndex >= 0 ? durations[durationIndex] : 1;
    
    if (selectedServiceType === 'temporary') {
      totalDays = selectedDuration * 30;
      totalPrice = servicePrice * totalDays;
    } else {
      totalDays = selectedDuration * 30;
      totalPrice = servicePrice * selectedDuration;
    }
    
    this.setData({
      servicePrice,
      totalDays,
      totalPrice
    });
  },

  /**
   * 表单验证
   */
  validateForm() {
    const { 
      selectedServiceType, 
      startDate, 
      durationIndex, 
      dailyHoursIndex,
      contactName, 
      contactPhone, 
      address 
    } = this.data;
    
    // 验证开始日期
    if (!startDate) {
      wx.showToast({
        title: '请选择开始日期',
        icon: 'none'
      });
      return false;
    }
    
    // 验证服务时长
    if (durationIndex < 0) {
      wx.showToast({
        title: '请选择服务时长',
        icon: 'none'
      });
      return false;
    }
    
    // 临时服务验证每日时长
    if (selectedServiceType === 'temporary' && dailyHoursIndex < 0) {
      wx.showToast({
        title: '请选择每日时长',
        icon: 'none'
      });
      return false;
    }
    
    // 验证联系人
    if (!contactName.trim()) {
      wx.showToast({
        title: '请输入联系人姓名',
        icon: 'none'
      });
      return false;
    }
    
    // 验证手机号
    if (!contactPhone.trim()) {
      wx.showToast({
        title: '请输入联系电话',
        icon: 'none'
      });
      return false;
    }
    
    if (!isValidPhone(contactPhone)) {
      wx.showToast({
        title: '请输入正确的手机号',
        icon: 'none'
      });
      return false;
    }
    
    // 验证地址
    if (!address.trim()) {
      wx.showToast({
        title: '请输入服务地址',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  /**
   * 提交订单
   */
  onSubmit() {
    if (this.data.isSubmitting) return;
    
    // 表单验证
    if (!this.validateForm()) return;
    
    this.setData({ isSubmitting: true });
    
    // 构建订单数据
    const workerServiceTypes = this.data.worker && Array.isArray(this.data.worker.serviceTypes)
      ? this.data.worker.serviceTypes
      : [];
    const workerPrimaryType = workerServiceTypes.length > 0 ? workerServiceTypes[0] : '';

    const orderData = {
      workerId: this.data.workerId,
      serviceType: workerPrimaryType,
      serviceMode: this.data.selectedServiceType,
      startDate: this.data.startDate,
      duration: this.data.durationOptions[this.data.durationIndex],
      dailyHours: this.data.dailyHoursIndex >= 0 ? this.data.dailyHoursOptions[this.data.dailyHoursIndex] : null,
      contactName: this.data.contactName,
      contactPhone: this.data.contactPhone,
      address: this.data.address,
      remark: this.data.remark,
      totalPrice: this.data.totalPrice
    };
    
    console.log('提交预约:', orderData);

    app.callCloudFunction('worker', 'bookWorker', orderData)
      .then(() => {
        this.setData({ isSubmitting: false });
        let hasRedirected = false;
        const goToBookings = () => {
          if (hasRedirected) return;
          hasRedirected = true;
          wx.redirectTo({
            url: '/packageB/pages/bookings/bookings',
            fail: (err) => {
              console.error('跳转我的预约失败，尝试 navigateTo:', err);
              wx.navigateTo({
                url: '/packageB/pages/bookings/bookings',
                fail: (navErr) => {
                  console.error('navigateTo 我的预约也失败:', navErr);
                  wx.showToast({
                    title: '跳转失败，请手动进入我的预约',
                    icon: 'none'
                  });
                }
              });
            }
          });
        };

        wx.showModal({
          title: '预约成功',
          content: '是否开启消息通知，及时接收预约和面试进展？',
          confirmText: '开启并查看',
          cancelText: '稍后再说',
          success: (res) => {
            if (!res.confirm) {
              goToBookings();
              return;
            }

            Promise.race([
              app.requestSubscribeNotifications({ showToast: false }).catch(() => null),
              new Promise((resolve) => setTimeout(resolve, 2000))
            ]).finally(() => {
              goToBookings();
            });
          },
          fail: () => {
            goToBookings();
          }
        });
      })
      .catch((err) => {
        this.setData({ isSubmitting: false });
        wx.showToast({
          title: err.message || '预约失败',
          icon: 'none'
        });
      });
  }
});
