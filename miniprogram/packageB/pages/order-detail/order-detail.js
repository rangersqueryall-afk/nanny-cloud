/**
 * 订单详情页
 * 展示订单的完整信息和操作流程
 */
const app = getApp();
const { formatDate } = require('../../../utils/util');
const { ORDER_DETAIL_STATUS_TEXT, ORDER_STATUS } = require('../../../utils/constants');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // 订单ID
    orderId: null,
    
    // 订单信息
    order: {},
    
    // 状态图标和描述
    statusIcon: '📋',
    statusDesc: '',
    
    // 状态流程
    processList: [],
    
    // 操作按钮
    actionButtons: []
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
    
    this.setData({ orderId: id });
    
    // 加载订单详情
    this.loadOrderDetail(id);
  },

  /**
   * 加载订单详情
   */
  loadOrderDetail(id) {
    app.callCloudFunction('order', 'getDetail', { id })
      .then((res) => {
        const order = res.data || {};
        const normalized = {
          id: order._id || id,
          orderNo: order._id || id,
          status: order.status || ORDER_STATUS.PENDING,
          statusText: ORDER_DETAIL_STATUS_TEXT[order.status] || '待服务',
          workerId: order.workerId,
          workerName: order.workerName || '阿姨',
          workerAvatar: order.workerAvatar || '/images/default-avatar.png',
          serviceType: order.serviceType || '',
          serviceDate: order.startDate || '',
          serviceTime: '',
          address: order.address || '',
          contactName: order.contactName || '',
          contactPhone: order.contactPhone || '',
          remark: order.remark || '',
          createTime: this.formatDateTime(order.createdAt),
          duration: '',
          servicePrice: order.price || 0,
          discount: 0,
          totalPrice: order.price || 0,
          isReviewed: false
        };
        this.setData({
          order: normalized
        }, () => {
          this.updateStatusInfo();
          this.updateProcessList();
          this.updateActionButtons();
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

  formatDateTime(value) {
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
    return formatDate(date, 'YYYY-MM-DD HH:mm:ss');
  },

  /**
   * 更新状态信息
   */
  updateStatusInfo() {
    const { order } = this.data;
    let statusIcon = '📋';
    let statusDesc = '';
    
    switch (order.status) {
      case ORDER_STATUS.PENDING:
        statusIcon = '⏳';
        statusDesc = '订单已提交，等待确认';
        break;
      case ORDER_STATUS.CONFIRMED:
        statusIcon = '✅';
        statusDesc = '订单已确认，等待服务开始';
        break;
      case ORDER_STATUS.SERVING:
      case ORDER_STATUS.IN_SERVICE:
        statusIcon = '🔄';
        statusDesc = '服务进行中';
        break;
      case ORDER_STATUS.COMPLETED:
        statusIcon = '🎉';
        statusDesc = '服务已完成，感谢您的使用';
        break;
      case ORDER_STATUS.CANCELLED:
        statusIcon = '❌';
        statusDesc = '订单已取消';
        break;
    }
    
    this.setData({ statusIcon, statusDesc });
  },

  /**
   * 更新状态流程
   */
  updateProcessList() {
    const { order } = this.data;
    
    const processes = [
      { name: '提交订单', key: 'submit' },
      { name: '订单确认', key: 'confirm' },
      { name: '开始服务', key: 'start' },
      { name: '服务完成', key: 'complete' }
    ];
    
    let completedSteps = 0;
    
    switch (order.status) {
      case ORDER_STATUS.PENDING:
        completedSteps = 1;
        break;
      case ORDER_STATUS.CONFIRMED:
        completedSteps = 2;
        break;
      case ORDER_STATUS.SERVING:
      case ORDER_STATUS.IN_SERVICE:
        completedSteps = 3;
        break;
      case ORDER_STATUS.COMPLETED:
        completedSteps = 4;
        break;
      case ORDER_STATUS.CANCELLED:
        completedSteps = 0;
        break;
    }
    
    const processList = processes.map((item, index) => ({
      ...item,
      completed: index < completedSteps,
      active: index === completedSteps - 1,
      time: index < completedSteps ? order.createTime : ''
    }));
    
    this.setData({ processList });
  },

  /**
   * 更新操作按钮
   */
  updateActionButtons() {
    const { order } = this.data;
    let buttons = [];
    
    switch (order.status) {
      case ORDER_STATUS.PENDING:
        buttons = [
          { text: '取消', action: 'cancel', type: 'default' },
          { text: '客服', action: 'contact', type: 'primary' }
        ];
        break;
      case ORDER_STATUS.CONFIRMED:
        buttons = [
          { text: '取消', action: 'cancel', type: 'default' },
          { text: '联系', action: 'call', type: 'primary' }
        ];
        break;
      case ORDER_STATUS.SERVING:
      case ORDER_STATUS.IN_SERVICE:
        buttons = [
          { text: '完成', action: 'complete', type: 'primary' }
        ];
        break;
      case ORDER_STATUS.COMPLETED:
        buttons = [
          { text: '再约', action: 'rebook', type: 'default' }
        ];
        if (!order.isReviewed) {
          buttons.unshift({ text: '评价', action: 'review', type: 'primary' });
        }
        break;
      case ORDER_STATUS.CANCELLED:
        buttons = [
          { text: '再约', action: 'rebook', type: 'primary' }
        ];
        break;
    }
    
    this.setData({ actionButtons: buttons });
  },

  /**
   * 点击操作按钮
   */
  onActionTap(e) {
    const { action } = e.currentTarget.dataset;
    const { orderId, order } = this.data;
    
    switch (action) {
      case 'cancel':
        this.handleCancel(orderId);
        break;
      case 'contact':
        this.handleContact();
        break;
      case 'call':
        this.handleCall();
        break;
      case 'complete':
        this.handleComplete(orderId);
        break;
      case 'review':
        this.handleReview(orderId);
        break;
      case 'rebook':
        this.handleRebook(order.workerId);
        break;
    }
  },

  /**
   * 取消订单
   */
  handleCancel(orderId) {
    wx.showModal({
      title: '确认取消',
      content: '确定要取消这个订单吗？',
      success: (res) => {
        if (res.confirm) {
          app.callCloudFunction('order', 'cancel', { id: orderId })
            .then(() => {
              wx.showToast({ title: '已取消', icon: 'success' });
              setTimeout(() => this.loadOrderDetail(orderId), 400);
            })
            .catch((err) => app.showToast(err.message || '取消失败'));
        }
      }
    });
  },

  /**
   * 联系客服
   */
  handleContact() {
    app.contactService();
  },

  /**
   * 联系阿姨
   */
  handleCall() {
    wx.showModal({
      title: '联系阿姨',
      content: '阿姨电话：138****8888',
      confirmText: '拨打',
      success: (res) => {
        if (res.confirm) {
          wx.makePhoneCall({
            phoneNumber: '13888888888'
          });
        }
      }
    });
  },

  /**
   * 确认完成
   */
  handleComplete(orderId) {
    wx.showModal({
      title: '确认完成',
      content: '确认服务已完成吗？',
      success: (res) => {
        if (res.confirm) {
          app.callCloudFunction('order', 'complete', { id: orderId })
            .then(() => {
              wx.showToast({ title: '已确认完成', icon: 'success' });
              setTimeout(() => this.loadOrderDetail(orderId), 400);
            })
            .catch((err) => app.showToast(err.message || '操作失败'));
        }
      }
    });
  },

  /**
   * 去评价
   */
  handleReview(orderId) {
    wx.navigateTo({
      url: `/packageB/pages/review/review?orderId=${orderId}`
    });
  },

  /**
   * 重新预约
   */
  handleRebook(workerId) {
    wx.navigateTo({
      url: `/packageA/pages/booking/booking?workerId=${workerId}`
    });
  },

  /**
   * 点击阿姨信息
   */
  onWorkerTap() {
    const { order } = this.data;
    wx.navigateTo({
      url: `/packageA/pages/worker-detail/worker-detail?id=${order.workerId}`
    });
  }
});
