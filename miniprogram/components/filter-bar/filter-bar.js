/**
 * 筛选栏组件
 * 支持多种筛选类型：列表选择、范围选择、自定义范围
 */
Component({
  /**
   * 组件属性
   */
  properties: {
    // 筛选配置
    filterConfig: {
      type: Array,
      value: [],
      observer(newVal) {
        // 初始化筛选器数据
        const filters = newVal.map(item => ({
          ...item,
          selectedLabel: ''
        }));
        this.setData({ filters });
      }
    },
    // 默认选中值
    defaultValues: {
      type: Object,
      value: {}
    }
  },

  /**
   * 组件初始数据
   */
  data: {
    filters: [],           // 筛选器列表
    activeIndex: -1,       // 当前激活的筛选器索引
    showPanel: false,      // 是否显示下拉面板
    currentFilter: {},     // 当前筛选器配置
    customMin: '',         // 自定义最小值
    customMax: ''          // 自定义最大值
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached() {
      // 初始化筛选器
      const filters = this.properties.filterConfig.map(item => ({
        ...item,
        selectedLabel: ''
      }));
      this.setData({ filters });
    }
  },

  /**
   * 组件方法
   */
  methods: {
    /**
     * 点击筛选项
     */
    onFilterTap(e) {
      const { index } = e.currentTarget.dataset;
      const { filters, activeIndex, showPanel } = this.data;
      
      // 如果点击的是当前激活项，则关闭面板
      if (activeIndex === index && showPanel) {
        this.closePanel();
        return;
      }
      
      // 打开对应筛选器的面板
      this.setData({
        activeIndex: index,
        currentFilter: filters[index],
        showPanel: true,
        customMin: '',
        customMax: ''
      });
    },

    /**
     * 点击遮罩层关闭
     */
    onMaskTap() {
      this.closePanel();
    },

    /**
     * 关闭面板
     */
    closePanel() {
      this.setData({
        activeIndex: -1,
        showPanel: false,
        currentFilter: {}
      });
    },

    /**
     * 选择选项
     */
    onOptionSelect(e) {
      const { value } = e.currentTarget.dataset;
      const { activeIndex, filters, currentFilter } = this.data;
      
      // 查找选项标签
      const option = currentFilter.options.find(opt => opt.value === value);
      
      // 更新筛选器状态
      const newFilters = [...filters];
      newFilters[activeIndex] = {
        ...currentFilter,
        value,
        selectedLabel: option ? option.label : value
      };
      
      this.setData({
        filters: newFilters
      });
      
      // 触发筛选变化事件
      this.triggerEvent('change', {
        key: currentFilter.key,
        value,
        label: option ? option.label : value,
        filterIndex: activeIndex
      });
      
      // 关闭面板
      this.closePanel();
    },

    /**
     * 自定义最小值输入
     */
    onMinInput(e) {
      this.setData({
        customMin: e.detail.value
      });
    },

    /**
     * 自定义最大值输入
     */
    onMaxInput(e) {
      this.setData({
        customMax: e.detail.value
      });
    },

    /**
     * 确认自定义范围
     */
    onCustomConfirm() {
      const { customMin, customMax, activeIndex, filters, currentFilter } = this.data;
      
      const min = parseFloat(customMin) || 0;
      const max = parseFloat(customMax) || Infinity;
      
      // 更新筛选器状态
      const newFilters = [...filters];
      newFilters[activeIndex] = {
        ...currentFilter,
        value: [min, max],
        selectedLabel: `${min}-${max === Infinity ? '不限' : max}`
      };
      
      this.setData({
        filters: newFilters
      });
      
      // 触发筛选变化事件
      this.triggerEvent('change', {
        key: currentFilter.key,
        value: [min, max],
        label: `${min}-${max === Infinity ? '不限' : max}`,
        filterIndex: activeIndex
      });
      
      this.closePanel();
    },

    /**
     * 重置筛选
     */
    onReset() {
      const { activeIndex, filters, currentFilter } = this.data;
      
      // 重置当前筛选器
      const newFilters = [...filters];
      newFilters[activeIndex] = {
        ...currentFilter,
        value: currentFilter.defaultValue || '',
        selectedLabel: ''
      };
      
      this.setData({
        filters: newFilters,
        customMin: '',
        customMax: ''
      });
      
      // 触发重置事件
      this.triggerEvent('reset', {
        key: currentFilter.key,
        filterIndex: activeIndex
      });
    },

    /**
     * 确认筛选
     */
    onConfirm() {
      this.closePanel();
      
      // 触发确认事件
      this.triggerEvent('confirm', {
        filters: this.data.filters
      });
    },

    /**
     * 获取当前筛选值
     */
    getFilterValues() {
      const result = {};
      this.data.filters.forEach(filter => {
        result[filter.key] = filter.value;
      });
      return result;
    },

    /**
     * 设置筛选值
     */
    setFilterValue(key, value) {
      const { filters } = this.data;
      const index = filters.findIndex(f => f.key === key);
      
      if (index !== -1) {
        const filter = filters[index];
        const option = filter.options ? filter.options.find(opt => opt.value === value) : null;
        
        const newFilters = [...filters];
        newFilters[index] = {
          ...filter,
          value,
          selectedLabel: option ? option.label : value
        };
        
        this.setData({ filters: newFilters });
      }
    },

    /**
     * 重置所有筛选
     */
    resetAll() {
      const { filterConfig } = this.properties;
      const filters = filterConfig.map(item => ({
        ...item,
        value: item.defaultValue || '',
        selectedLabel: ''
      }));
      
      this.setData({ filters });
      
      this.triggerEvent('resetAll');
    }
  }
});
