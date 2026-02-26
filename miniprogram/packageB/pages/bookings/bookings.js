const app = getApp();

const SERVICE_TYPE_TEXT = {
  livein: '住家服务',
  daytime: '白班服务',
  temporary: '临时服务'
};

const STATUS_TEXT = {
  pending: '待处理',
  confirmed: '已确认',
  cancelled: '已取消',
  completed: '已完成'
};

Page({
  data: {
    bookings: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false
  },

  onLoad() {
    this.loadBookings(true);
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
    const { pageSize } = this.data;

    app.callCloudFunction('worker', 'getMyBookings', { page, limit: pageSize })
      .then((res) => {
        const list = (res.data && res.data.list ? res.data.list : []).map((item) => ({
          ...item,
          createdAtText: this.formatDate(item.createdAt),
          statusText: STATUS_TEXT[item.status] || '未知状态',
          serviceTypeText: SERVICE_TYPE_TEXT[item.serviceType] || item.serviceType || '-'
        }));

        this.setData({
          bookings: reset ? list : [...this.data.bookings, ...list],
          page: page + 1,
          hasMore: list.length >= pageSize,
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

  onGoWorkers() {
    wx.navigateTo({
      url: '/pages/workers/workers'
    });
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
            const bookings = this.data.bookings.map((item) => {
              if (item._id === bookingId) {
                return {
                  ...item,
                  status: 'cancelled',
                  statusText: STATUS_TEXT.cancelled
                };
              }
              return item;
            });
            this.setData({ bookings });
            app.showToast('预约已取消', 'success');
          })
          .catch((err) => {
            app.showToast(err.message || '取消失败');
          });
      }
    });
  },

  formatDate(value) {
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
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
});
