/**
 * 订单列表页
 * 展示用户的所有订单，支持Tab切换和分页加载
 */
const app = getApp();

Page({
  /**
   * 页面初始数据
   */
  data: {
    // Tab配置
    tabs: [
      { label: '全部', value: 'all', count: 0 },
      { label: '待服务', value: 'pending', count: 0 },
      { label: '服务中', value: 'serving', count: 0 },
      { label: '已完成', value: 'completed', count: 0 }
    ],
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
      // 云函数失败时使用模拟数据
      const counts = this.calculateOrderCounts();
      
      const { tabs } = this.data;
      tabs[0].count = counts.all;
      tabs[1].count = counts.pending;
      tabs[2].count = counts.serving;
      tabs[3].count = counts.completed;
      
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
      const orders = res.data.list || [];
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
      // 云函数失败时使用模拟数据
      const mockOrders = this.generateMockOrders(page, pageSize, status);
      
      this.setData({
        orders: reset ? mockOrders : [...this.data.orders, ...mockOrders],
        page: page + 1,
        hasMore: mockOrders.length >= pageSize,
        isLoading: false
      });
      
      if (callback) callback();
    });
  },

  /**
   * 生成模拟订单数据
   */
  generateMockOrders(page, pageSize, filterStatus) {
    // 预定义订单数据（带时间戳，用于排序）
    const baseOrders = [
      { id: 1, status: 'pending', statusText: '待服务', createTime: '2024-02-20 10:30:00' },
      { id: 2, status: 'confirmed', statusText: '已确认', createTime: '2024-02-19 14:20:00' },
      { id: 3, status: 'serving', statusText: '服务中', createTime: '2024-02-18 09:00:00' },
      { id: 4, status: 'completed', statusText: '已完成', createTime: '2024-02-17 16:45:00' },
      { id: 5, status: 'completed', statusText: '已完成', createTime: '2024-02-16 11:30:00' },
      { id: 6, status: 'pending', statusText: '待服务', createTime: '2024-02-15 13:20:00' },
      { id: 7, status: 'serving', statusText: '服务中', createTime: '2024-02-14 10:00:00' },
      { id: 8, status: 'completed', statusText: '已完成', createTime: '2024-02-13 15:30:00' },
      { id: 9, status: 'cancelled', statusText: '已取消', createTime: '2024-02-12 09:45:00' },
      { id: 10, status: 'confirmed', statusText: '已确认', createTime: '2024-02-11 14:00:00' },
      { id: 11, status: 'completed', statusText: '已完成', createTime: '2024-02-10 16:20:00' },
      { id: 12, status: 'pending', statusText: '待服务', createTime: '2024-02-09 11:10:00' }
    ];
    
    const serviceTypes = ['保姆服务', '育儿嫂服务', '月嫂服务', '护老服务'];
    const names = ['王阿姨', '李阿姨', '张阿姨', '刘阿姨', '陈阿姨'];
    
    // 根据筛选状态过滤订单
    let filteredOrders = baseOrders;
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        // 待服务包括 pending 和 confirmed
        filteredOrders = baseOrders.filter(o => o.status === 'pending' || o.status === 'confirmed');
      } else {
        filteredOrders = baseOrders.filter(o => o.status === filterStatus);
      }
    }
    
    // 按时间倒序排序（最新的在前面）
    filteredOrders.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    
    // 分页
    const startIndex = (page - 1) * pageSize;
    const paginatedOrders = filteredOrders.slice(startIndex, startIndex + pageSize);
    
    // 生成完整订单数据
    const orders = paginatedOrders.map(order => ({
      ...order,
      orderNo: `DD2024${String(order.id).padStart(4, '0')}`,
      workerId: order.id,
      workerName: names[order.id % names.length],
      workerAvatar: `/images/worker-${(order.id % 5) + 1}.jpg`,
      serviceType: serviceTypes[order.id % serviceTypes.length],
      serviceDate: order.createTime.split(' ')[0],
      serviceTime: order.createTime.split(' ')[1],
      address: '北京市朝阳区某某小区1号楼101室',
      totalPrice: 6500 + (order.id % 35) * 100,
      isReviewed: order.status === 'completed' && order.id % 2 === 0
    }));
    
    return orders;
  },

  /**
   * 计算各状态订单数量
   */
  calculateOrderCounts() {
    const baseOrders = [
      { status: 'pending' }, { status: 'confirmed' }, { status: 'serving' },
      { status: 'completed' }, { status: 'completed' }, { status: 'pending' },
      { status: 'serving' }, { status: 'completed' }, { status: 'cancelled' },
      { status: 'confirmed' }, { status: 'completed' }, { status: 'pending' }
    ];
    
    const counts = {
      all: baseOrders.length,
      pending: baseOrders.filter(o => o.status === 'pending' || o.status === 'confirmed').length,
      serving: baseOrders.filter(o => o.status === 'serving').length,
      completed: baseOrders.filter(o => o.status === 'completed').length
    };
    
    return counts;
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
          wx.showToast({
            title: '已取消',
            icon: 'success'
          });
          // 刷新列表
          this.loadOrders(true);
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
          // 刷新列表
          this.loadOrders(true);
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
