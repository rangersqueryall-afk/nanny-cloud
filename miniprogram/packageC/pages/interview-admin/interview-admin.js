const app = getApp();
const { BOOKING_STATUS, BOOKING_STATUS_TEXT, INTERVIEW_ADMIN_TABS } = require('../../../utils/constants');

Page({
  data: {
    tabs: INTERVIEW_ADMIN_TABS,
    currentTab: 0,
    list: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false
  },

  onLoad() {
    this.loadList(true);
  },

  onTabChange(e) {
    const index = Number(e.currentTarget.dataset.index || 0);
    if (index === this.data.currentTab) return;
    this.setData({
      currentTab: index,
      list: [],
      page: 1,
      hasMore: true
    }, () => this.loadList(true));
  },

  onRefresh() {
    if (this.data.isRefreshing) return;
    this.setData({ isRefreshing: true });
    this.loadList(true, () => {
      this.setData({ isRefreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  onLoadMore() {
    if (this.data.isLoading || !this.data.hasMore) return;
    this.loadList(false);
  },

  loadList(reset = false, callback) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    const page = reset ? 1 : this.data.page;
    const { pageSize, currentTab, tabs } = this.data;
    const filter = tabs[currentTab].value;

    app.callCloudFunction('worker', 'getPlatformBookings', {
      filter,
      page,
      limit: pageSize
    }).then((res) => {
      const list = (res.data && res.data.list ? res.data.list : []).map((item) => ({
        ...item,
        statusText: BOOKING_STATUS_TEXT[item.status] || item.status || '未知状态',
        createdAtText: this.formatDate(item.createdAt),
        canSchedule: item.status === BOOKING_STATUS.ACCEPTED,
        canSetResult: item.status === BOOKING_STATUS.INTERVIEW_SCHEDULED
      }));
      this.setData({
        list: reset ? list : this.data.list.concat(list),
        page: page + 1,
        hasMore: list.length >= pageSize,
        isLoading: false
      });
      if (callback) callback();
    }).catch((err) => {
      this.setData({ isLoading: false });
      app.showToast(err.message || '加载失败');
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
          this.loadList(true);
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
          this.loadList(true);
        }).catch((err) => app.showToast(err.message || '操作失败'));
      }
    });
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
  }
});
