/**
 * 阿姨卡片组件
 * 用于展示阿姨的基本信息
 */
Component({
  /**
   * 组件属性
   */
  properties: {
    // 阿姨数据
    worker: {
      type: Object,
      value: {},
      observer(newVal) {
        // 数据变化时的处理
        if (newVal && !newVal.skills) {
          this.setData({
            'worker.skills': []
          });
        }
      }
    },
    // 是否显示预约按钮
    showBookBtn: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件初始数据
   */
  data: {
    // 默认头像
    defaultAvatar: '/images/default-avatar.png'
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 组件挂载时
    },
    ready() {
      // 组件渲染完成
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 点击卡片
     */
    onTap() {
      const { worker } = this.properties;
      // 触发点击事件，传递阿姨ID
      this.triggerEvent('cardtap', {
        workerId: worker.id || worker._id,
        worker: worker 
      });
    },

    /**
     * 点击预约按钮
     */
    onBookTap() {
      const { worker } = this.properties;
      if (worker && worker.isBooked) return;
      // 触发预约事件
      this.triggerEvent('book', { 
        workerId: worker.id || worker._id,
        worker: worker 
      });
    }
  }
});
