const app = getApp();

Page({
  data: {
    form: {
      name: '',
      avatar: '',
      age: '',
      hometown: '',
      phone: '',
      experience: '',
      serviceTypes: [],
      skills: [],
      priceMonthly: '',
      priceDaily: '',
      bio: '',
      isVerified: false,
      isPublic: false
    },
    skillsInput: '',
    serviceTypes: [
      { id: 'babysitter', name: '保姆' },
      { id: 'nanny', name: '育儿嫂' },
      { id: 'maternity', name: '月嫂' },
      { id: 'elderly', name: '护老' },
      { id: 'hourly', name: '钟点工' }
    ]
  },

  onLoad() {
    this.loadMyWorkerInfo();
  },

  loadMyWorkerInfo() {
    app.showLoading('加载中...');
    app.callCloudFunction('user', 'getMyWorkerInfo')
      .then((res) => {
        const info = res.data || {};
        const skills = info.skills || [];
        this.setData({
          form: {
            name: info.name || '',
            avatar: info.avatar || '',
            age: info.age || '',
            hometown: info.hometown || '',
            phone: info.phone || '',
            experience: info.experience || '',
            serviceTypes: info.serviceTypes || [],
            skills,
            priceMonthly: info.price && info.price.monthly ? info.price.monthly : '',
            priceDaily: info.price && info.price.daily ? info.price.daily : '',
            bio: info.bio || '',
            isVerified: !!info.isVerified,
            isPublic: !!info.isPublic
          },
          skillsInput: skills.join('，')
        });
      })
      .catch((err) => {
        app.showToast(err.message || '加载失败');
      })
      .finally(() => {
        app.hideLoading();
      });
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`form.${field}`]: e.detail.value
    });
  },

  onSkillsInput(e) {
    const value = e.detail.value;
    const skills = value.split(/[,，]/).map(s => s.trim()).filter(s => s);
    this.setData({
      skillsInput: value,
      'form.skills': skills
    });
  },

  toggleServiceType(e) {
    const { id } = e.currentTarget.dataset;
    const list = [...this.data.form.serviceTypes];
    const idx = list.indexOf(id);
    if (idx > -1) {
      list.splice(idx, 1);
    } else {
      list.push(id);
    }
    this.setData({
      'form.serviceTypes': list
    });
  },

  onVerifiedChange(e) {
    this.setData({
      'form.isVerified': !!e.detail.value
    });
  },

  onPublicChange(e) {
    this.setData({
      'form.isPublic': !!e.detail.value
    });
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
            this.setData({
              'form.avatar': uploadRes.fileID
            });
          },
          fail: () => {
            app.showToast('上传失败');
          }
        });
      }
    });
  },

  onSubmit() {
    const { form } = this.data;
    const payload = {
      name: form.name,
      avatar: form.avatar,
      age: parseInt(form.age, 10) || 0,
      hometown: form.hometown,
      phone: form.phone,
      experience: parseInt(form.experience, 10) || 0,
      serviceTypes: form.serviceTypes || [],
      skills: form.skills || [],
      priceMonthly: parseInt(form.priceMonthly, 10) || 0,
      priceDaily: parseInt(form.priceDaily, 10) || 0,
      bio: form.bio || '',
      isVerified: !!form.isVerified,
      isPublic: !!form.isPublic
    };

    app.showLoading('保存中...');
    app.callCloudFunction('user', 'updateMyWorkerInfo', payload)
      .then(() => {
        app.showToast('保存成功', 'success');
      })
      .catch((err) => {
        app.showToast(err.message || '保存失败');
      })
      .finally(() => {
        app.hideLoading();
      });
  }
});
