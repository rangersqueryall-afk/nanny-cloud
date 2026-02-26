const app = getApp();

Page({
  data: {
    favorites: [],
    page: 1,
    pageSize: 10,
    hasMore: true,
    isLoading: false,
    isRefreshing: false
  },

  onLoad() {
    this.loadFavorites(true);
  },

  onPullDownRefresh() {
    this.onRefresh();
  },

  onRefresh() {
    if (this.data.isRefreshing) return;
    this.setData({ isRefreshing: true });
    this.loadFavorites(true, () => {
      this.setData({ isRefreshing: false });
      wx.stopPullDownRefresh();
    });
  },

  onLoadMore() {
    if (this.data.isLoading || !this.data.hasMore) return;
    this.loadFavorites(false);
  },

  loadFavorites(reset = false, callback) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    const page = reset ? 1 : this.data.page;
    const { pageSize } = this.data;

    app.callCloudFunction('worker', 'getFavorites', { page, limit: pageSize })
      .then((res) => {
        const list = (res.data && res.data.list ? res.data.list : []).map((item) => ({
          ...item,
          createdAtText: this.formatDate(item.createdAt)
        }));

        this.setData({
          favorites: reset ? list : [...this.data.favorites, ...list],
          page: page + 1,
          hasMore: list.length >= pageSize,
          isLoading: false
        });
        if (callback) callback();
      })
      .catch((err) => {
        console.error('加载收藏列表失败:', err);
        const localList = this.getLocalFavorites();
        this.setData({
          favorites: reset ? localList : [...this.data.favorites, ...localList],
          page: page + 1,
          hasMore: false,
          isLoading: false
        });
        app.showToast('云端收藏获取失败，已展示本地收藏');
        if (callback) callback();
      });
  },

  onCardTap(e) {
    const workerId = e.currentTarget.dataset.workerId;
    if (!workerId) return;
    wx.navigateTo({
      url: `/packageA/pages/worker-detail/worker-detail?id=${workerId}`
    });
  },

  onRemove(e) {
    const workerId = e.currentTarget.dataset.workerId;
    if (!workerId) return;

    wx.showModal({
      title: '取消收藏',
      content: '确定取消收藏该阿姨吗？',
      success: (res) => {
        if (!res.confirm) return;
        app.callCloudFunction('worker', 'removeFavorite', { workerId })
          .then(() => {
            app.showToast('已取消收藏', 'success');
            const favorites = this.data.favorites.filter(item => String(item.workerId) !== String(workerId));
            this.setData({ favorites });
            if (favorites.length === 0) {
              this.setData({ hasMore: false });
            }
          })
          .catch((err) => {
            app.showToast(err.message || '操作失败');
          });
      }
    });
  },

  onGoWorkers() {
    wx.navigateTo({
      url: '/pages/workers/workers'
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
    if (!date) return '';
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getLocalFavorites() {
    const list = wx.getStorageSync('collectList') || [];
    return list.map((item) => ({
      workerId: item.id,
      workerName: item.name || '阿姨',
      workerAvatar: item.avatar || '/images/default-avatar.png',
      createdAtText: this.formatDate(item.addTime || Date.now())
    }));
  }
});
