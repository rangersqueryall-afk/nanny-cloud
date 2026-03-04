const app = getApp();
const { BOOKING_STATUS, BOOKING_STATUS_TEXT, INTERVIEW_ADMIN_TABS } = require('../../../utils/constants');

const MANAGEMENT_TABS = [
  { label: '预约管理', value: 'booking' },
  { label: '用户管理', value: 'user' },
  { label: '阿姨管理', value: 'worker' },
  { label: '统计', value: 'stats' }
];

const RANGE_OPTIONS = [
  { label: '最近', value: 'recent' },
  { label: '1个月', value: '1m' },
  { label: '2个月', value: '2m' },
  { label: '3个月', value: '3m' },
  { label: '6个月', value: '6m' },
  { label: '1年', value: '12m' },
  { label: '2年', value: '24m' }
];

Page({
  data: {
    managementTabs: MANAGEMENT_TABS,
    activeManagement: 'booking',
    bookingTabs: INTERVIEW_ADMIN_TABS,
    currentBookingTab: 0,
    list: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false,
    rangeOptions: RANGE_OPTIONS,
    rangeIndex: 0,
    stats: {
      totalUsers: 0,
      totalWorkers: 0,
      newUsers: 0,
      newWorkers: 0,
      totalOrders: 0,
      newOrders: 0,
      paidOrders: 0,
      completedOrders: 0,
      payableAmount: 0,
      paidAmount: 0
    }
  },

  onLoad() {
    app.requestSubscribeNotifications({ showToast: false }).catch(() => null);
    this.loadCurrent(true);
  },

  onManageTabChange(e) {
    const value = e.currentTarget.dataset.value;
    if (!value || value === this.data.activeManagement) return;
    this.setData({
      activeManagement: value,
      list: [],
      page: 1,
      hasMore: true
    }, () => this.loadCurrent(true));
  },

  onBookingTabChange(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    if (index === this.data.currentBookingTab) return;
    this.setData({
      currentBookingTab: index,
      list: [],
      page: 1,
      hasMore: true
    }, () => this.loadCurrent(true));
  },

  onRangeChange(e) {
    const index = Number(e.detail.value || 0);
    this.setData({ rangeIndex: index }, () => this.loadStats());
  },

  onRefresh() {
    if (this.data.isRefreshing) return;
    this.setData({ isRefreshing: true });
    this.loadCurrent(true, () => {
      this.setData({ isRefreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  onLoadMore() {
    if (this.data.activeManagement === 'stats') return;
    if (this.data.isLoading || !this.data.hasMore) return;
    this.loadCurrent(false);
  },

  loadCurrent(reset = false, callback) {
    const mode = this.data.activeManagement;
    if (mode === 'booking') return this.loadBookings(reset, callback);
    if (mode === 'user') return this.loadUsers(reset, callback);
    if (mode === 'worker') return this.loadWorkers(reset, callback);
    return this.loadStats(callback);
  },

  loadBookings(reset = false, callback) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });
    const page = reset ? 1 : this.data.page;
    const filter = this.data.bookingTabs[this.data.currentBookingTab].value;
    app.callCloudFunction('worker', 'getPlatformBookings', {
      filter,
      page,
      limit: this.data.pageSize
    }).then((res) => {
      const list = (res.data && res.data.list ? res.data.list : []).map((item) => ({
        ...item,
        statusText: BOOKING_STATUS_TEXT[item.status] || item.status || '未知状态',
        createdAtText: this.formatDate(item.createdAt),
        discountFactor: this.normalizeDiscountFactor(item.discountFactor),
        canSchedule: item.status === BOOKING_STATUS.ACCEPTED,
        canSetResult: item.status === BOOKING_STATUS.INTERVIEW_SCHEDULED,
        canSetDiscount: ![
          BOOKING_STATUS.REJECTED,
          BOOKING_STATUS.INTERVIEW_FAILED,
          BOOKING_STATUS.CANCELLED_BY_EMPLOYER,
          BOOKING_STATUS.TERMINATED
        ].includes(item.status)
      }));
      this.setData({
        list: reset ? list : this.data.list.concat(list),
        page: page + 1,
        hasMore: list.length >= this.data.pageSize,
        isLoading: false
      });
      if (callback) callback();
    }).catch((err) => {
      this.setData({ isLoading: false });
      app.showToast(err.message || '加载失败');
      if (callback) callback();
    });
  },

  loadUsers(reset = false, callback) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });
    const page = reset ? 1 : this.data.page;
    app.callCloudFunction('user', 'platformGetUsers', {
      page,
      limit: this.data.pageSize,
      role: 'all'
    }).then((res) => {
      const list = (res.data && res.data.list ? res.data.list : []).map((item) => ({
        ...item,
        createdAtText: this.formatDateTime(item.createdAt)
      }));
      this.setData({
        list: reset ? list : this.data.list.concat(list),
        page: page + 1,
        hasMore: list.length >= this.data.pageSize,
        isLoading: false
      });
      if (callback) callback();
    }).catch((err) => {
      this.setData({ isLoading: false });
      app.showToast(err.message || '加载失败');
      if (callback) callback();
    });
  },

  loadWorkers(reset = false, callback) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });
    const page = reset ? 1 : this.data.page;
    app.callCloudFunction('user', 'platformGetWorkers', {
      page,
      limit: this.data.pageSize,
      status: 'all'
    }).then((res) => {
      const list = (res.data && res.data.list ? res.data.list : []).map((item) => ({
        ...item,
        createdAtText: this.formatDateTime(item.createdAt),
        serviceTypesText: Array.isArray(item.serviceTypes) ? item.serviceTypes.join(' / ') : ''
      }));
      this.setData({
        list: reset ? list : this.data.list.concat(list),
        page: page + 1,
        hasMore: list.length >= this.data.pageSize,
        isLoading: false
      });
      if (callback) callback();
    }).catch((err) => {
      this.setData({ isLoading: false });
      app.showToast(err.message || '加载失败');
      if (callback) callback();
    });
  },

  loadStats(callback) {
    const rangeKey = this.data.rangeOptions[this.data.rangeIndex].value;
    this.setData({ isLoading: true, hasMore: false, list: [] });
    Promise.all([
      app.callCloudFunction('user', 'platformGetGrowthStats', { rangeKey }),
      app.callCloudFunction('order', 'platformGetStats', { rangeKey })
    ]).then(([userStatsRes, orderStatsRes]) => {
      const userStats = userStatsRes.data || {};
      const orderStats = orderStatsRes.data || {};
      this.setData({
        isLoading: false,
        stats: {
          totalUsers: userStats.totalUsers || 0,
          totalWorkers: userStats.totalWorkers || 0,
          newUsers: userStats.newUsers || 0,
          newWorkers: userStats.newWorkers || 0,
          totalOrders: orderStats.totalOrders || 0,
          newOrders: orderStats.newOrders || 0,
          paidOrders: orderStats.paidOrders || 0,
          completedOrders: orderStats.completedOrders || 0,
          payableAmount: orderStats.payableAmount || 0,
          paidAmount: orderStats.paidAmount || 0
        }
      });
      if (callback) callback();
    }).catch((err) => {
      this.setData({ isLoading: false });
      app.showToast(err.message || '统计加载失败');
      if (callback) callback();
    });
  },

  onScheduleInterview(e) {
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
        }).then(() => {
          app.showToast('面试已安排', 'success');
          this.loadBookings(true);
        }).catch((err) => app.showToast(err.message || '操作失败'));
      }
    });
  },

  onSetInterviewResult(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    const passed = !!e.currentTarget.dataset.passed;
    if (!bookingId) return;
    wx.showModal({
      title: passed ? '面试通过' : '面试不通过',
      content: passed ? '确认标记该预约面试通过？' : '确认标记该预约面试不通过？',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('worker', 'platformSetInterviewResult', {
          bookingId,
          passed,
          platformNote: passed ? '平台判定面试通过' : '平台判定面试不通过'
        }).then(() => {
          app.showToast('更新成功', 'success');
          this.loadBookings(true);
        }).catch((err) => app.showToast(err.message || '操作失败'));
      }
    });
  },

  onSetDiscount(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    const current = this.normalizeDiscountFactor(e.currentTarget.dataset.discountFactor);
    if (!bookingId) return;
    wx.showModal({
      title: '设置折扣系数',
      editable: true,
      placeholderText: '请输入 0.01 - 1，默认 1',
      content: String(current),
      success: (res) => {
        if (!res.confirm) return;
        const val = Number((res.content || '').trim() || '1');
        if (!Number.isFinite(val) || val <= 0 || val > 1) {
          app.showToast('请输入 0.01 - 1 的数字');
          return;
        }
        app.callCloudFunction('worker', 'platformSetBookingDiscount', {
          bookingId,
          discountFactor: Number(val.toFixed(2))
        }).then(() => {
          app.showToast('折扣系数已更新', 'success');
          this.loadBookings(true);
        }).catch((err) => app.showToast(err.message || '操作失败'));
      }
    });
  },

  onToggleWorkerPublic(e) {
    const workerId = e.currentTarget.dataset.workerId;
    const isPublic = !!e.currentTarget.dataset.isPublic;
    if (!workerId) return;
    app.callCloudFunction('user', 'platformSetWorkerPublic', {
      workerId,
      isPublic: !isPublic
    }).then(() => {
      app.showToast(!isPublic ? '已上架' : '已下架', 'success');
      this.loadWorkers(true);
    }).catch((err) => app.showToast(err.message || '操作失败'));
  },

  normalizeDiscountFactor(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > 1) return 1;
    return Number(n.toFixed(2));
  },

  formatDate(value) {
    if (!value) return '';
    let date = null;
    if (value instanceof Date) date = value;
    if (!date && (typeof value === 'string' || typeof value === 'number')) date = new Date(value);
    if (!date && value && typeof value === 'object' && typeof value.seconds === 'number') {
      date = new Date(value.seconds * 1000);
    }
    if (!date || Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  formatDateTime(value) {
    const d = this.formatDate(value);
    if (!d) return '';
    return d;
  }
});
