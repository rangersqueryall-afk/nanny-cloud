/**
 * 加载动画组件
 * 支持多种加载动画类型：旋转、点动画、脉冲、进度条、骨架屏
 */
Component({
  /**
   * 组件属性
   */
  properties: {
    // 是否显示
    visible: {
      type: Boolean,
      value: false
    },
    // 动画类型：spinner(旋转) | dots(点) | pulse(脉冲) | bar(进度条) | skeleton(骨架屏)
    type: {
      type: String,
      value: 'spinner'
    },
    // 加载文字
    text: {
      type: String,
      value: '加载中...'
    },
    // 是否全屏显示
    fullScreen: {
      type: Boolean,
      value: false
    },
    // 是否显示遮罩层
    mask: {
      type: Boolean,
      value: true
    },
    // 点击遮罩是否关闭
    maskClosable: {
      type: Boolean,
      value: false
    },
    // 进度条进度(0-100)
    progress: {
      type: Number,
      value: 0
    },
    // 是否显示进度百分比
    showPercent: {
      type: Boolean,
      value: true
    },
    // 骨架屏行数
    skeletonRows: {
      type: Number,
      value: 3
    },
    // 骨架屏是否显示头像
    showAvatar: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件初始数据
   */
  data: {
    // 骨架屏数据
    skeletonData: []
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 初始化骨架屏数据
      this.generateSkeletonData();
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 生成骨架屏数据
     */
    generateSkeletonData() {
      const { skeletonRows } = this.properties;
      const data = [];
      
      for (let i = 0; i < skeletonRows; i++) {
        // 随机生成不同宽度的行
        const titleWidth = `${70 + Math.random() * 20}%`;
        const descWidth = `${40 + Math.random() * 30}%`;
        
        data.push({
          titleWidth,
          descWidth
        });
      }
      
      this.setData({
        skeletonData: data
      });
    },

    /**
     * 点击遮罩层
     */
    onMaskTap() {
      if (this.properties.maskClosable) {
        this.hide();
      }
    },

    /**
     * 显示加载
     */
    show(options = {}) {
      const { text, type, fullScreen } = options;
      
      this.setData({
        visible: true,
        text: text || this.properties.text,
        type: type || this.properties.type,
        fullScreen: fullScreen !== undefined ? fullScreen : this.properties.fullScreen
      });
    },

    /**
     * 隐藏加载
     */
    hide() {
      this.setData({
        visible: false
      });
    },

    /**
     * 更新进度
     */
    updateProgress(progress) {
      if (this.properties.type === 'bar') {
        this.setData({
          progress: Math.min(100, Math.max(0, progress))
        });
      }
    },

    /**
     * 更新文字
     */
    updateText(text) {
      this.setData({ text });
    }
  }
});
