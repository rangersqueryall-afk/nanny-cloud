/**
 * 订单详情页
 * 展示订单的完整信息和操作流程
 */
const app = getApp();
const { formatDate } = require('../../../utils/util');

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
    // 模拟API请求
    setTimeout(() => {
      const mockOrder = {
        id: parseInt(id),
        orderNo: `DD2024011500${id}`,
        status: 'pending',
        statusText: '待服务',
        workerId: 1,
        workerName: '王阿姨',
        workerAvatar: 'https://i.pravatar.cc/150?img=1',
        serviceType: '保姆服务',
        serviceDate: '2024-02-01',
        serviceTime: '09:00',
        address: '北京市朝阳区某某小区1号楼101室',
        contactName: '张先生',
        contactPhone: '138****8888',
        remark: '家里有老人需要照顾，请多关照',
        createTime: '2024-01-15 14:30:00',
        duration: '3个月',
        servicePrice: 6500,
        discount: 200,
        totalPrice: 19300,
        isReviewed: false
      };
      
      this.setData({
        order: mockOrder
      }, () => {
        this.updateStatusInfo();
        this.updateProcessList();
        this.updateActionButtons();
      });
    }, 500);
  },

  /**
   * 更新状态信息
   */
  updateStatusInfo() {
    const { order } = this.data;
    let statusIcon = '📋';
    let statusDesc = '';
    
    switch (order.status) {
      case 'pending':
        statusIcon = '⏳';
        statusDesc = '订单已提交，等待确认';
        break;
      case 'confirmed':
        statusIcon = '✅';
        statusDesc = '订单已确认，等待服务开始';
        break;
      case 'serving':
        statusIcon = '🔄';
        statusDesc = '服务进行中';
        break;
      case 'completed':
        statusIcon = '🎉';
        statusDesc = '服务已完成，感谢您的使用';
        break;
      case 'cancelled':
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
      case 'pending':
        completedSteps = 1;
        break;
      case 'confirmed':
        completedSteps = 2;
        break;
      case 'serving':
        completedSteps = 3;
        break;
      case 'completed':
        completedSteps = 4;
        break;
      case 'cancelled':
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
      case 'pending':
        buttons = [
          { text: '取消', action: 'cancel', type: 'default' },
          { text: '客服', action: 'contact', type: 'primary' }
        ];
        break;
      case 'confirmed':
        buttons = [
          { text: '取消', action: 'cancel', type: 'default' },
          { text: '联系', action: 'call', type: 'primary' }
        ];
        break;
      case 'serving':
        buttons = [
          { text: '完成', action: 'complete', type: 'primary' }
        ];
        break;
      case 'completed':
        buttons = [
          { text: '再约', action: 'rebook', type: 'default' }
        ];
        if (!order.isReviewed) {
          buttons.unshift({ text: '评价', action: 'review', type: 'primary' });
        }
        break;
      case 'cancelled':
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
          wx.showToast({
            title: '已取消',
            icon: 'success'
          });
          // 刷新页面
          setTimeout(() => {
            this.loadOrderDetail(orderId);
          }, 1500);
        }
      }
    });
  },

  /**
   * 联系客服
   */
  handleContact() {
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
          wx.showToast({
            title: '已确认完成',
            icon: 'success'
          });
          // 刷新页面
          setTimeout(() => {
            this.loadOrderDetail(orderId);
          }, 1500);
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
