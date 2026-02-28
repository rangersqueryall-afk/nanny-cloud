const app = getApp();
const { BOOKING_STATUS, BOOKING_STATUS_TEXT, SERVICE_TYPE_TEXT, USER_ROLE } = require('../../../utils/constants');

Page({
  data: {
    mode: 'employer',
    isWorker: false,
    bookings: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false
  },

  onLoad() {
    this.bootstrap();
  },

  onShow() {
    if (!this.data.isLoading) {
      this.loadBookings(true);
    }
  },

  bootstrap() {
    app.callCloudFunction('user', 'getProfile')
      .then((res) => {
        const profile = res.data || {};
        const isWorker = profile.role === USER_ROLE.WORKER;
        this.setData({
          isWorker,
          mode: isWorker ? 'worker' : 'employer'
        }, () => this.loadBookings(true));
      })
      .catch((err) => {
        console.error('加载用户身份失败:', err);
        this.setData({ isWorker: false, mode: 'employer' }, () => this.loadBookings(true));
      });
  },

  onRefresh() {
    if (this.data.isRefreshing) return;
    this.setData({ isRefreshing: true });
    this.loadBookings(true, () => {
      this.setData({ isRefreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  onLoadMore() {
    if (this.data.isLoading || !this.data.hasMore) return;
    this.loadBookings(false);
  },

  loadBookings(reset = false, callback) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    const page = reset ? 1 : this.data.page;
    const { pageSize, mode } = this.data;
    const action = mode === 'worker' ? 'getWorkerBookings' : 'getMyBookings';

    app.callCloudFunction('worker', action, { page, limit: pageSize })
      .then((res) => {
        const incoming = (res.data && res.data.list ? res.data.list : []).map((item) => this.normalizeBooking(item));
        this.setData({
          bookings: reset ? incoming : [...this.data.bookings, ...incoming],
          page: page + 1,
          hasMore: incoming.length >= pageSize,
          isLoading: false
        });
        if (callback) callback();
      })
      .catch((err) => {
        console.error('加载预约列表失败:', err);
        this.setData({ isLoading: false });
        app.showToast(err.message || '加载失败');
        if (callback) callback();
      });
  },

  normalizeBooking(item) {
    const isWorkerMode = this.data.mode === 'worker';
    const status = item.status || BOOKING_STATUS.PENDING;
    const employerName = item.contactName || item.userNickname || '雇主';
    return {
      ...item,
      displayName: isWorkerMode ? employerName : (item.workerName || '阿姨'),
      displayAvatar: isWorkerMode ? '/images/default-avatar.png' : (item.workerAvatar || '/images/default-avatar.png'),
      createdAtText: this.formatDate(item.createdAt),
      statusText: BOOKING_STATUS_TEXT[status] || '未知状态',
      serviceTypeText: SERVICE_TYPE_TEXT[item.serviceType] || item.serviceType || '-',
      canCancel: !isWorkerMode && status === BOOKING_STATUS.PENDING,
      canTerminate: !isWorkerMode && [BOOKING_STATUS.ACCEPTED, BOOKING_STATUS.INTERVIEW_SCHEDULED, BOOKING_STATUS.INTERVIEW_PASSED].includes(status),
      canSubmitOrder: !isWorkerMode && status === BOOKING_STATUS.INTERVIEW_PASSED,
      canViewOrder: !isWorkerMode && status === BOOKING_STATUS.ORDER_CREATED && !!item.orderId,
      canWorkerAccept: isWorkerMode && status === BOOKING_STATUS.PENDING,
      canWorkerReject: isWorkerMode && status === BOOKING_STATUS.PENDING,
      canWorkerContact: isWorkerMode && !!item.contactPhone
    };
  },

  onGoWorkers() {
    wx.navigateTo({ url: '/pages/workers/workers' });
  },

  onCancelBooking(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    wx.showModal({
      title: '取消预约',
      content: '确定取消该预约吗？',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('worker', 'cancelBooking', { bookingId })
          .then(() => {
            app.showToast('预约已取消', 'success');
            this.loadBookings(true);
          })
          .catch((err) => app.showToast(err.message || '取消失败'));
      }
    });
  },

  onTerminateBooking(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    wx.showModal({
      title: '终止预约',
      content: '确定终止该预约吗？',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('worker', 'terminateBooking', { bookingId })
          .then(() => {
            app.showToast('预约已终止', 'success');
            this.loadBookings(true);
          })
          .catch((err) => app.showToast(err.message || '操作失败'));
      }
    });
  },

  onSubmitOrder(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    wx.showModal({
      title: '提交订单',
      content: '提交订单即视为已签署服务合同，是否继续？',
      confirmText: '确认签署',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('order', 'createFromBooking', {
          bookingId,
          contractSigned: true
        })
          .then((ret) => {
            app.showToast('订单创建成功', 'success');
            const orderId = ret.data && ret.data.orderId;
            if (orderId) {
              setTimeout(() => {
                wx.navigateTo({ url: `/packageB/pages/order-detail/order-detail?id=${orderId}` });
              }, 300);
            } else {
              this.loadBookings(true);
            }
          })
          .catch((err) => app.showToast(err.message || '提交失败'));
      }
    });
  },

  onViewOrder(e) {
    const orderId = e.currentTarget.dataset.orderId;
    if (!orderId) return;
    wx.navigateTo({ url: `/packageB/pages/order-detail/order-detail?id=${orderId}` });
  },

  onWorkerAccept(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    app.callCloudFunction('worker', 'acceptBooking', { bookingId })
      .then(() => {
        app.showToast('已接受预约', 'success');
        this.loadBookings(true);
      })
      .catch((err) => app.showToast(err.message || '操作失败'));
  },

  onWorkerReject(e) {
    const bookingId = e.currentTarget.dataset.bookingId;
    if (!bookingId) return;
    wx.showModal({
      title: '拒绝预约',
      editable: true,
      placeholderText: '可选：填写拒绝原因',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('worker', 'rejectBooking', {
          bookingId,
          reason: res.content || ''
        })
          .then(() => {
            app.showToast('已拒绝预约', 'success');
            this.loadBookings(true);
          })
          .catch((err) => app.showToast(err.message || '操作失败'));
      }
    });
  },

  onWorkerContact(e) {
    const phone = e.currentTarget.dataset.phone;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: String(phone) });
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
