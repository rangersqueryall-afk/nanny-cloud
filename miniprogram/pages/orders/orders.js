/**
 * 订单列表页
 * 展示用户的所有订单，支持Tab切换和分页加载
 */
const app = getApp();
const { ORDER_LIST_STATUS_TEXT, ORDER_PAGE_TABS, ORDER_STATUS } = require('../../utils/constants');

Page({
  /**
   * 页面初始数据
   */
  data: {
    // Tab配置
    tabs: ORDER_PAGE_TABS.map((item) => ({ ...item, count: 0 })),
    currentTab: 0,
    
    // 订单列表
    orders: [],
    
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
    // 处理传入的tabIndex参数
    if (options.tabIndex !== undefined) {
      const tabIndex = parseInt(options.tabIndex) || 0;
      this.setData({
        currentTab: tabIndex
      });
    }
    
    // 加载订单数据
    this.loadOrders(true);
    // 加载各状态订单数量
    this.loadOrderCounts();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 刷新数据
    this.loadOrders(true);
  },

  /**
   * Tab切换
   */
  onTabChange(e) {
    const { index } = e.currentTarget.dataset;
    if (index === this.data.currentTab) return;
    
    this.setData({
      currentTab: index,
      orders: [],
      page: 1,
      hasMore: true,
      scrollTop: 0
    }, () => {
      this.loadOrders(true);
    });
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
   * 下拉刷新
   */
  onRefresh() {
    console.log('订单页面下拉刷新触发');
    
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
    
    this.loadOrders(true, () => {
      clearTimeout(refreshTimeout);
      this.setData({ isRefreshing: false });
      console.log('订单页面下拉刷新完成');
    });
    this.loadOrderCounts();
  },

  /**
   * 加载更多
   */
  onLoadMore() {
    if (this.data.isLoading || !this.data.hasMore) return;
    this.loadOrders(false);
  },

  /**
   * 加载订单数量
   */
  loadOrderCounts() {
    const app = getApp();
    
    // 调用云函数获取订单统计
    app.callCloudFunction('order', 'getStats', {})
    .then((res) => {
      const stats = res.data || {};
      
      const { tabs } = this.data;
      tabs[0].count = stats.all || 0;
      tabs[1].count = stats.pending || 0;
      tabs[2].count = stats.serving || 0;
      tabs[3].count = stats.completed || 0;
      
      this.setData({ tabs });
    })
    .catch((err) => {
      console.error('获取订单统计失败:', err);
      const { tabs } = this.data;
      tabs[0].count = 0;
      tabs[1].count = 0;
      tabs[2].count = 0;
      tabs[3].count = 0;
      this.setData({ tabs });
    });
  },

  /**
   * 加载订单列表
   */
  loadOrders(reset = false, callback) {
    if (this.data.isLoading) return;
    
    this.setData({ isLoading: true });
    
    const page = reset ? 1 : this.data.page;
    const { currentTab, tabs, pageSize } = this.data;
    const status = tabs[currentTab].value;
    
    // 调用云函数获取订单
    const app = getApp();
    app.callCloudFunction('order', 'getList', {
      page: page,
      limit: pageSize,
      status: status
    })
    .then((res) => {
      const orders = (res.data.list || []).map((item) => {
        const normalizedStatus = item.status === ORDER_STATUS.IN_SERVICE ? ORDER_STATUS.SERVING : item.status;
        return {
          ...item,
          id: item._id || item.id,
          orderNo: item._id || item.id,
          serviceDate: item.startDate || '',
          serviceTime: item.endDate ? `至 ${item.endDate}` : '',
          totalPrice: item.price || 0,
          status: normalizedStatus,
          statusText: ORDER_LIST_STATUS_TEXT[item.status] || ORDER_LIST_STATUS_TEXT[normalizedStatus] || '未知状态'
        };
      });
      const pagination = res.data.pagination || {};
      
      this.setData({
        orders: reset ? orders : [...this.data.orders, ...orders],
        page: page + 1,
        hasMore: orders.length >= pageSize && page < pagination.totalPages,
        isLoading: false
      });
      
      if (callback) callback();
    })
    .catch((err) => {
      console.error('获取订单失败:', err);
      this.setData({
        orders: reset ? [] : this.data.orders,
        hasMore: false,
        isLoading: false
      });
      app.showToast(err.message || '加载失败');
      if (callback) callback();
    });
  },

  /**
   * 点击订单卡片
   */
  onOrderTap(e) {
    const { orderId } = e.detail;
    wx.navigateTo({
      url: `/packageB/pages/order-detail/order-detail?id=${orderId}`
    });
  },

  /**
   * 订单操作
   */
  onOrderAction(e) {
    const { action, orderId, order } = e.detail;
    
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
              this.loadOrders(true);
              this.loadOrderCounts();
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
              this.loadOrders(true);
              this.loadOrderCounts();
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
   * 去预约
   */
  onGoBooking() {
    wx.navigateTo({
      url: '/pages/workers/workers'
    });
  }
});
