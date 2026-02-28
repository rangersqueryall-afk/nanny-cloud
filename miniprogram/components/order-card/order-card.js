/**
 * 订单卡片组件
 * 用于展示订单信息
 */
const { ORDER_STATUS } = require('../../utils/constants');

Component({
  /**
   * 组件属性
   */
  properties: {
    // 订单数据
    order: {
      type: Object,
      value: {},
      observer(newVal) {
        if (newVal && newVal.status) {
          this.updateActionButtons(newVal.status);
        }
      }
    }
  },

  /**
   * 组件初始数据
   */
  data: {
    // 操作按钮
    actionButtons: []
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 根据订单状态设置操作按钮
      const { order } = this.properties;
      if (order && order.status) {
        this.updateActionButtons(order.status);
      }
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 根据订单状态更新操作按钮
     */
    updateActionButtons(status) {
      let buttons = [];
      
      switch (status) {
        case ORDER_STATUS.PENDING: // 待确认
          buttons = [
            { text: '取消', action: 'cancel', type: 'default' },
            { text: '客服', action: 'contact', type: 'default' }
          ];
          break;
        case ORDER_STATUS.CONFIRMED: // 已确认
          buttons = [
            { text: '取消', action: 'cancel', type: 'default' },
            { text: '联系', action: 'call', type: 'primary' }
          ];
          break;
        case ORDER_STATUS.SERVING: // 服务中
        case ORDER_STATUS.IN_SERVICE:
          buttons = [
            { text: '完成', action: 'complete', type: 'primary' }
          ];
          break;
        case ORDER_STATUS.COMPLETED: // 已完成
          buttons = [
            { text: '再约', action: 'rebook', type: 'default' }
          ];
          if (!this.properties.order.isReviewed) {
            buttons.unshift({ text: '评价', action: 'review', type: 'primary' });
          }
          break;
        case ORDER_STATUS.CANCELLED: // 已取消
          buttons = [
            { text: '再约', action: 'rebook', type: 'primary' }
          ];
          break;
        default:
          buttons = [];
      }
      
      this.setData({
        actionButtons: buttons
      });
    },

    /**
     * 点击卡片
     */
    onTap() {
      const { order } = this.properties;
      this.triggerEvent('tap', { 
        orderId: order.id || order._id,
        order: order 
      });
    },

    /**
     * 点击操作按钮
     */
    onActionTap(e) {
      const { action } = e.currentTarget.dataset;
      const { order } = this.properties;
      
      this.triggerEvent('action', { 
        action,
        orderId: order.id || order._id,
        order: order 
      });
    }
  }
});
