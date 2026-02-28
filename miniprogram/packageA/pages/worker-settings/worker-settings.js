const app = getApp();
const { SERVICE_TYPE_TEXT } = require('../../../utils/constants');

const SERVICE_OPTIONS = [
  { value: 'babysitter', label: SERVICE_TYPE_TEXT.babysitter },
  { value: 'nanny', label: SERVICE_TYPE_TEXT.nanny },
  { value: 'maternity', label: SERVICE_TYPE_TEXT.maternity },
  { value: 'elderly', label: SERVICE_TYPE_TEXT.elderly },
  { value: 'hourly', label: SERVICE_TYPE_TEXT.hourly }
];

const SHIFT_OPTIONS = [
  { value: 'daytime', label: '白班' },
  { value: 'all_day', label: '全天' }
];

const WEEK_OPTIONS = [
  { value: 'mon_fri', label: '周一至周五' },
  { value: 'mon_sat', label: '周一至周六' },
  { value: 'all_week', label: '全天' }
];

Page({
  data: {
    isLoading: false,
    isSubmitting: false,
    serviceOptions: SERVICE_OPTIONS,
    shiftOptions: SHIFT_OPTIONS,
    weekOptions: WEEK_OPTIONS,
    selectedServiceTypes: [],
    status: 'offline',
    isVerified: false,
    shiftType: 'daytime',
    weekDays: 'mon_fri',
    isLiveIn: false,
    hourlyStart: '09:00',
    hourlyEnd: '18:00',
    workTime: '',
    note: '',
    skillsInput: '',
    form: {
      name: '',
      avatar: '',
      age: '',
      hometown: '',
      phone: '',
      experience: '',
      priceMonthly: '',
      priceDaily: '',
      bio: ''
    }
  },

  onLoad() {
    this.loadSettings();
  },

  loadSettings() {
    this.setData({ isLoading: true });
    Promise.all([
      app.callCloudFunction('user', 'getMyWorkerSettings').catch(() => ({ data: {} })),
      app.callCloudFunction('user', 'getMyWorkerInfo').catch(() => ({ data: {} }))
    ])
      .then(([settingsRes, infoRes]) => {
        const settings = settingsRes.data || {};
        const info = infoRes.data || {};
        const prefs = settings.acceptPreferences || {};
        const skills = info.skills || [];
        this.setData({
          isLoading: false,
          status: settings.status || 'offline',
          isVerified: !!settings.isVerified,
          selectedServiceTypes: (prefs.serviceTypes && prefs.serviceTypes.length > 0) ? prefs.serviceTypes : (info.serviceTypes || []),
          shiftType: prefs.shiftType || 'daytime',
          weekDays: prefs.weekDays || 'mon_fri',
          isLiveIn: !!prefs.isLiveIn,
          hourlyStart: prefs.hourlyStart || '09:00',
          hourlyEnd: prefs.hourlyEnd || '18:00',
          workTime: prefs.workTime || '',
          note: prefs.note || '',
          skillsInput: skills.join('，'),
          form: {
            name: info.name || '',
            avatar: info.avatar || '',
            age: info.age || '',
            hometown: info.hometown || '',
            phone: info.phone || '',
            experience: info.experience || '',
            priceMonthly: info.price && info.price.monthly ? info.price.monthly : '',
            priceDaily: info.price && info.price.daily ? info.price.daily : '',
            bio: info.bio || ''
          }
        });
      })
      .catch((err) => {
        this.setData({ isLoading: false });
        app.showToast(err.message || '加载失败');
      });
  },

  onStatusChange(e) {
    this.setData({ status: e.detail.value ? 'available' : 'offline' });
  },

  toggleServiceType(e) {
    const { value } = e.currentTarget.dataset;
    const list = [...this.data.selectedServiceTypes];
    const idx = list.indexOf(value);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(value);
    }
    this.setData({ selectedServiceTypes: list });
  },

  onShiftChange(e) {
    this.setData({ shiftType: e.detail.value });
  },

  onWeekDaysChange(e) {
    this.setData({ weekDays: e.detail.value });
  },

  onLiveInChange(e) {
    this.setData({ isLiveIn: !!e.detail.value });
  },

  onHourlyStartChange(e) {
    this.setData({ hourlyStart: e.detail.value });
  },

  onHourlyEndChange(e) {
    this.setData({ hourlyEnd: e.detail.value });
  },

  onWorkTimeInput(e) {
    this.setData({ workTime: e.detail.value });
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onSkillsInput(e) {
    this.setData({ skillsInput: e.detail.value });
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}.jpg`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            this.setData({ 'form.avatar': uploadRes.fileID });
          },
          fail: () => {
            app.showToast('上传失败');
          }
        });
      }
    });
  },

  onSubmit() {
    if (this.data.isSubmitting) return;
    if (!this.data.selectedServiceTypes || this.data.selectedServiceTypes.length === 0) {
      app.showToast('请选择至少一种服务类型');
      return;
    }
    if (this.data.selectedServiceTypes.includes('hourly') && (!this.data.hourlyStart || !this.data.hourlyEnd)) {
      app.showToast('请选择钟点工具体时间');
      return;
    }

    const skills = (this.data.skillsInput || '').split(/[,，]/).map((s) => s.trim()).filter((s) => s);
    const infoPayload = {
      name: this.data.form.name,
      avatar: this.data.form.avatar,
      age: parseInt(this.data.form.age, 10) || 0,
      hometown: this.data.form.hometown,
      phone: this.data.form.phone,
      experience: parseInt(this.data.form.experience, 10) || 0,
      serviceTypes: this.data.selectedServiceTypes,
      skills,
      priceMonthly: parseInt(this.data.form.priceMonthly, 10) || 0,
      priceDaily: parseInt(this.data.form.priceDaily, 10) || 0,
      bio: this.data.form.bio || ''
    };

    const settingsPayload = {
      status: this.data.status,
      acceptPreferences: {
        serviceTypes: this.data.selectedServiceTypes,
        shiftType: this.data.shiftType,
        weekDays: this.data.weekDays,
        isLiveIn: this.data.isLiveIn,
        hourlyStart: this.data.hourlyStart,
        hourlyEnd: this.data.hourlyEnd,
        workTime: this.data.workTime,
        note: this.data.note
      }
    };

    this.setData({ isSubmitting: true });
    Promise.all([
      app.callCloudFunction('user', 'updateMyWorkerInfo', infoPayload),
      app.callCloudFunction('user', 'updateMyWorkerSettings', settingsPayload)
    ])
      .then(() => {
        this.setData({ isSubmitting: false });
        app.showToast('保存成功', 'success');
      })
      .catch((err) => {
        this.setData({ isSubmitting: false });
        app.showToast(err.message || '保存失败');
      });
  }
});
