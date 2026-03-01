Component({
  properties: {
    tabs: {
      type: Array,
      value: []
    },
    value: {
      type: null,
      value: ''
    }
  },

  methods: {
    onTabTap(e) {
      const index = Number(e.currentTarget.dataset.index);
      const tab = (this.data.tabs || [])[index];
      if (!tab) return;
      const value = tab.value;
      if (value === this.data.value) return;
      this.triggerEvent('change', { index, value, tab });
    }
  }
});

