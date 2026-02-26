/**
 * 星级评分组件
 * 支持点击评分、滑动评分、只读显示
 */
Component({
  /**
   * 组件属性
   */
  properties: {
    // 当前评分值
    value: {
      type: Number,
      value: 0,
      observer(newVal) {
        this.setData({
          score: Math.round(newVal),
          currentScore: newVal.toFixed(1)
        });
      }
    },
    // 最大星级
    max: {
      type: Number,
      value: 5
    },
    // 是否只读
    readonly: {
      type: Boolean,
      value: false
    },
    // 尺寸：small, medium, large
    size: {
      type: String,
      value: 'medium'
    },
    // 是否显示分数
    showScore: {
      type: Boolean,
      value: false
    },
    // 是否允许半星
    allowHalf: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件初始数据
   */
  data: {
    stars: [1, 2, 3, 4, 5],
    score: 0,        // 实际评分
    hoverScore: 0,   // 悬停评分
    currentScore: '0.0'
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 初始化星星数组
      const stars = [];
      for (let i = 1; i <= this.properties.max; i++) {
        stars.push(i);
      }
      
      this.setData({
        stars,
        score: Math.round(this.properties.value),
        currentScore: this.properties.value.toFixed(1)
      });
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 点击星星
     */
    onTap(e) {
      if (this.properties.readonly) return;
      
      const { index } = e.currentTarget.dataset;
      const score = index + 1;
      
      this.setData({
        score,
        currentScore: score.toFixed(1)
      });
      
      // 触发评分变化事件
      this.triggerEvent('change', { 
        value: score,
        score: score 
      });
    },

    /**
     * 触摸开始
     */
    onTouchStart(e) {
      if (this.properties.readonly) return;
      this.updateScoreByTouch(e);
    },

    /**
     * 触摸移动
     */
    onTouchMove(e) {
      if (this.properties.readonly) return;
      this.updateScoreByTouch(e);
    },

    /**
     * 根据触摸位置更新评分
     */
    updateScoreByTouch(e) {
      const query = this.createSelectorQuery();
      query.select('.star-rating').boundingClientRect();
      query.exec((res) => {
        if (!res[0]) return;
        
        const rect = res[0];
        const touchX = e.touches[0].clientX - rect.left;
        const starWidth = rect.width / this.properties.max;
        
        let score = Math.ceil(touchX / starWidth);
        score = Math.max(1, Math.min(score, this.properties.max));
        
        this.setData({
          hoverScore: score
        });
        
        // 触摸结束时更新实际评分
        if (e.type === 'touchend') {
          this.setData({
            score,
            currentScore: score.toFixed(1),
            hoverScore: 0
          });
          
          this.triggerEvent('change', { 
            value: score,
            score: score 
          });
        }
      });
    },

    /**
     * 获取当前评分
     */
    getValue() {
      return this.data.score;
    },

    /**
     * 设置评分
     */
    setValue(value) {
      const score = Math.max(0, Math.min(value, this.properties.max));
      this.setData({
        score: Math.round(score),
        currentScore: score.toFixed(1)
      });
    },

    /**
     * 重置评分
     */
    reset() {
      this.setData({
        score: 0,
        currentScore: '0.0',
        hoverScore: 0
      });
    }
  }
});
