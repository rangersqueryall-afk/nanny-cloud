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
      bio: ''
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
    const { serviceTypes } = this.data.form;
    const index = serviceTypes.indexOf(id);
    
    if (index > -1) {
      serviceTypes.splice(index, 1);
    } else {
      serviceTypes.push(id);
    }
    
    this.setData({
      'form.serviceTypes': serviceTypes
    });
  },

  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0];
        // 上传图片到云存储
        wx.cloud.uploadFile({
          cloudPath: `avatars/${Date.now()}.jpg`,
          filePath: tempFilePath,
          success: (uploadRes) => {
            this.setData({
              'form.avatar': uploadRes.fileID
            });
          },
          fail: (err) => {
            app.showToast('上传失败');
          }
        });
      }
    });
  },

  validate() {
    const { form } = this.data;
    if (!form.name.trim()) {
      app.showToast('请输入姓名');
      return false;
    }
    if (!form.age || form.age < 18 || form.age > 70) {
      app.showToast('请输入有效的年龄（18-70岁）');
      return false;
    }
    if (!form.hometown.trim()) {
      app.showToast('请输入籍贯');
      return false;
    }
    if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) {
      app.showToast('请输入有效的手机号');
      return false;
    }
    if (!form.experience || form.experience < 0) {
      app.showToast('请输入工作经验');
      return false;
    }
    if (form.serviceTypes.length === 0) {
      app.showToast('请至少选择一项服务类型');
      return false;
    }
    if (!form.priceMonthly || form.priceMonthly < 1000) {
      app.showToast('请输入有效的服务价格（不低于1000元/月）');
      return false;
    }
    return true;
  },

  submit() {
    if (!this.validate()) return;

    app.showLoading('提交中...');

    const { form } = this.data;
    const data = {
      name: form.name,
      avatar: form.avatar,
      age: parseInt(form.age),
      hometown: form.hometown,
      phone: form.phone,
      experience: parseInt(form.experience),
      serviceTypes: form.serviceTypes,
      skills: form.skills,
      priceMonthly: parseInt(form.priceMonthly),
      bio: form.bio
    };

    app.callCloudFunction('user', 'registerWorker', data)
      .then((res) => {
        const workerId = res.data && res.data.workerId;
        if (app.globalData.userInfo) {
          app.globalData.userInfo.role = 'worker';
          app.globalData.userInfo.workerId = workerId || app.globalData.userInfo.workerId;
          wx.setStorageSync('userInfo', app.globalData.userInfo);
        }

        app.hideLoading();
        wx.showModal({
          title: '注册成功',
          content: '您的信息已提交，请等待审核通过',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      })
      .catch((err) => {
        app.hideLoading();
        app.showToast(err.message || '注册失败');
      });
  }
});
