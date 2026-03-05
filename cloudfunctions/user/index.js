/**
 * 用户云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 脱敏姓名
function maskName(name) {
  if (!name || name.length === 0) return '**';
  if (name.length === 1) return name + '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '**';
}

const RANGE_MONTHS_MAP = {
  recent: 0,
  '1m': 1,
  '2m': 2,
  '3m': 3,
  '6m': 6,
  '12m': 12,
  '24m': 24
};

function formatPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

function parseRangeStart(rangeKey) {
  const key = String(rangeKey || 'recent');
  const months = Object.prototype.hasOwnProperty.call(RANGE_MONTHS_MAP, key) ? RANGE_MONTHS_MAP[key] : 0;
  const now = new Date();
  if (months <= 0) {
    const start = new Date(now.getTime());
    start.setDate(start.getDate() - 7);
    return start;
  }
  const start = new Date(now.getTime());
  start.setMonth(start.getMonth() - months);
  return start;
}

async function assertPlatform(openid) {
  const userRes = await db.collection('users').where({ openid }).limit(1).get();
  if (!userRes.data || userRes.data.length === 0) {
    throw new Error('用户不存在');
  }
  const user = userRes.data[0];
  if (user.role !== 'platform') {
    throw new Error('仅平台管理员可操作');
  }
  return user;
}

exports.main = async (event, context) => {
  console.log('云函数收到请求:', event);
  
  const { action, data } = event;
  const OPENID = cloud.getWXContext().OPENID;
  
  console.log('action:', action, 'openid:', OPENID);

  try {
    if (action === 'login') {
      return await login(OPENID, data);
    } else if (action === 'getProfile') {
      return await getProfile(OPENID);
    } else if (action === 'updateProfile') {
      return await updateProfile(OPENID, data);
    } else if (action === 'bindPhone') {
      return await bindPhone(OPENID, data);
    } else if (action === 'registerWorker') {
      return await registerWorker(OPENID, data);
    } else if (action === 'updateWorkerStatus') {
      return await updateWorkerStatus(OPENID, data);
    } else if (action === 'getMyWorkerInfo') {
      return await getMyWorkerInfo(OPENID);
    } else if (action === 'updateMyWorkerInfo') {
      return await updateMyWorkerInfo(OPENID, data);
    } else if (action === 'getMyWorkerSettings') {
      return await getMyWorkerSettings(OPENID);
    } else if (action === 'updateMyWorkerSettings') {
      return await updateMyWorkerSettings(OPENID, data);
    } else if (action === 'platformGetUsers') {
      return await platformGetUsers(OPENID, data);
    } else if (action === 'platformGetWorkers') {
      return await platformGetWorkers(OPENID, data);
    } else if (action === 'platformSetWorkerPublic') {
      return await platformSetWorkerPublic(OPENID, data);
    } else if (action === 'platformGetGrowthStats') {
      return await platformGetGrowthStats(OPENID, data);
    } else if (action === 'platformSetUserRole') {
      return await platformSetUserRole(OPENID, data);
    } else {
      return { success: false, message: '未知操作: ' + action };
    }
  } catch (error) {
    console.error('云函数执行错误:', error);
    return { success: false, message: error.message };
  }
};

async function login(openid, data) {
  console.log('=== 云函数 login 开始 ===');
  console.log('openid:', openid);
  console.log('传入的 data:', data);
  console.log('nickName:', data && data.nickName);
  console.log('avatarUrl:', data && data.avatarUrl);
  
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    console.log('查询用户结果数:', userRes.data.length);
    
    let user;
    if (userRes.data.length === 0) {
      // 新用户，创建用户记录
      console.log('新用户，创建记录');
      const newUser = {
        openid: openid,
        nickname: data && data.nickName ? data.nickName : '微信用户',
        avatar: data && data.avatarUrl ? data.avatarUrl : '/images/default-avatar.png',
        phone: null,
        role: 'user',
        workerId: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      };
      console.log('新用户数据:', newUser);
      
      const addRes = await db.collection('users').add({ data: newUser });
      console.log('创建用户成功, _id:', addRes._id);
      
      user = { _id: addRes._id };
      for (var key in newUser) {
        user[key] = newUser[key];
      }
    } else {
      // 已有用户 - 强制更新头像和昵称
      user = userRes.data[0];
      console.log('已有用户, 当前数据:', { nickname: user.nickname, avatar: user.avatar });
      
      // 只要有传入数据，就更新用户信息（强制更新）
      if (data) {
        console.log('更新用户信息, 传入的 nickName:', data.nickName, 'avatarUrl:', data.avatarUrl);
        
        // 检查昵称是否有效（不为空、不为"微信用户"）
        let newNickname = user.nickname;
        if (data.nickName && data.nickName !== '' && data.nickName !== '微信用户') {
          newNickname = data.nickName;
          console.log('使用传入的昵称:', newNickname);
        } else {
          console.log('昵称无效，保留原昵称:', newNickname);
        }
        
        // 检查头像是否有效
        let newAvatar = user.avatar;
        if (data.avatarUrl && data.avatarUrl !== '' && data.avatarUrl !== '/images/default-avatar.png') {
          newAvatar = data.avatarUrl;
          console.log('使用传入的头像:', newAvatar);
        } else {
          console.log('头像无效，保留原头像:', newAvatar);
        }
        
        const updateData = { 
          updatedAt: db.serverDate(),
          nickname: newNickname,
          avatar: newAvatar
        };
        
        console.log('最终更新数据:', updateData);
        await db.collection('users').doc(user._id).update({ data: updateData });
        console.log('更新成功');
        
        user.nickname = updateData.nickname;
        user.avatar = updateData.avatar;
      }
    }
    
    console.log('最终 user 数据:', { nickname: user.nickname, avatar: user.avatar });

    const role = user.role || 'user';
    let workerInfo = null;
    if (role === 'worker' && user.workerId) {
      try {
        const workerRes = await db.collection('workers').doc(user.workerId).get();
        workerInfo = workerRes.data;
        if (workerInfo) {
          workerInfo.maskedName = maskName(workerInfo.name);
        }
      } catch (e) {
        console.log('获取阿姨信息失败:', e);
      }
    }

    return {
      success: true,
      data: {
        userInfo: {
          _id: user._id,
          nickname: user.nickname,
          avatar: user.avatar,
          phone: user.phone,
          role: role,
          workerId: user.workerId
        },
        workerInfo: workerInfo
      },
      message: '登录成功'
    };
  } catch (error) {
    console.error('login函数错误:', error);
    return { success: false, message: '登录失败: ' + error.message };
  }
}

async function getProfile(openid) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];

    const role = user.role || 'user';
    let workerInfo = null;
    if (role === 'worker' && user.workerId) {
      try {
        const workerRes = await db.collection('workers').doc(user.workerId).get();
        workerInfo = workerRes.data;
        if (workerInfo) {
          workerInfo.maskedName = maskName(workerInfo.name);
        }
      } catch (e) {
        console.log('获取阿姨信息失败:', e);
      }
    }

    return {
      success: true,
      data: {
        _id: user._id,
        nickname: user.nickname,
        avatar: user.avatar,
        phone: user.phone,
        role: role,
        workerId: user.workerId,
        workerInfo: workerInfo
      },
      message: '获取成功'
    };
  } catch (error) {
    console.error('getProfile函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function updateProfile(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).limit(1).get();

    const nickname = data && typeof data.nickname === 'string' ? data.nickname.trim() : '';
    const avatar = data && typeof data.avatar === 'string' ? data.avatar.trim() : '';
    const phone = data && typeof data.phone === 'string' ? data.phone.trim() : '';

    const profilePatch = { updatedAt: db.serverDate() };
    if (nickname) profilePatch.nickname = nickname;
    if (avatar) profilePatch.avatar = avatar;
    if (phone) profilePatch.phone = phone;

    if (userRes.data.length === 0) {
      const newUser = {
        openid,
        nickname: nickname || '微信用户',
        avatar: avatar || '/images/default-avatar.png',
        phone: phone || null,
        role: 'user',
        workerId: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      };
      const addRes = await db.collection('users').add({ data: newUser });
      return {
        success: true,
        data: { _id: addRes._id, ...newUser },
        message: '创建并更新成功'
      };
    }

    const user = userRes.data[0];
    await db.collection('users').doc(user._id).update({ data: profilePatch });

    return {
      success: true,
      data: {
        _id: user._id,
        nickname: nickname || user.nickname || '',
        avatar: avatar || user.avatar || '',
        phone: phone || user.phone || ''
      },
      message: '更新成功'
    };
  } catch (error) {
    console.error('updateProfile函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function bindPhone(openid, data) {
  try {
    const code = data && data.code ? String(data.code).trim() : '';
    if (!code) {
      return { success: false, message: '手机号授权码缺失' };
    }

    const phoneRes = await cloud.openapi.phonenumber.getPhoneNumber({ code });
    const phoneInfo = phoneRes && phoneRes.result && phoneRes.result.phoneInfo ? phoneRes.result.phoneInfo : {};
    const phoneNumber = phoneInfo.purePhoneNumber || phoneInfo.phoneNumber || '';

    if (!phoneNumber) {
      return { success: false, message: '获取手机号失败' };
    }

    const userRes = await db.collection('users').where({ openid }).limit(1).get();
    if (userRes.data.length === 0) {
      const newUser = {
        openid,
        nickname: '微信用户',
        avatar: '/images/default-avatar.png',
        phone: phoneNumber,
        role: 'user',
        workerId: null,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate()
      };
      const addRes = await db.collection('users').add({ data: newUser });
      return {
        success: true,
        data: {
          _id: addRes._id,
          phone: phoneNumber
        },
        message: '绑定成功'
      };
    }

    const user = userRes.data[0];
    await db.collection('users').doc(user._id).update({
      data: {
        phone: phoneNumber,
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      data: {
        _id: user._id,
        phone: phoneNumber
      },
      message: '绑定成功'
    };
  } catch (error) {
    console.error('bindPhone函数错误:', error);
    const errCode = error && (error.errCode || error.code);
    if (String(errCode) === '240029') {
      return {
        success: false,
        message: '手机号接口未开通或云函数权限未配置，请在云函数 user 的 config.json 中加入 phonenumber.getPhoneNumber 并重新部署'
      };
    }
    return { success: false, message: error.message || '绑定失败' };
  }
}

async function registerWorker(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];

    const role = user.role || 'user';

    if (role === 'platform') {
      return { success: false, message: '平台管理员账号不可注册为阿姨' };
    }

    if (role === 'worker') {
      return { success: false, message: '您已注册为阿姨' };
    }

    const workerData = {
      name: data.name,
      avatar: data.avatar ? data.avatar : '/images/default-avatar.png',
      age: data.age,
      hometown: data.hometown,
      experience: data.experience,
      serviceTypes: data.serviceTypes ? data.serviceTypes : [],
      price: {
        daily: data.priceDaily ? data.priceDaily : 200,
        monthly: data.priceMonthly ? data.priceMonthly : 6000
      },
      skills: data.skills ? data.skills : [],
      phone: data.phone,
      bio: data.bio ? data.bio : '',
      rating: 5.0,
      reviewCount: 0,
      orderCount: 0,
      isVerified: false,
      isPublic: false,
      status: 'offline',
      userOpenid: openid,
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    };

    const workerRes = await db.collection('workers').add({ data: workerData });

    await db.collection('users').where({ openid: openid }).update({
      data: {
        role: 'worker',
        workerId: workerRes._id,
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      data: {
        workerId: workerRes._id,
        maskedName: maskName(workerData.name)
      },
      message: '注册成功，请等待审核'
    };
  } catch (error) {
    console.error('registerWorker函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function updateWorkerStatus(openid, data) {
  try {
    const isPublic = data.isPublic;
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];

    if (user.role !== 'worker' || !user.workerId) {
      return { success: false, message: '您不是阿姨' };
    }

    await db.collection('workers').doc(user.workerId).update({
      data: {
        isPublic: isPublic,
        status: isPublic ? 'available' : 'offline',
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      data: { isPublic: isPublic },
      message: isPublic ? '已开放，其他人可以搜索到您' : '已隐藏，其他人无法搜索到您'
    };
  } catch (error) {
    console.error('updateWorkerStatus函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function getMyWorkerInfo(openid) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];

    if (user.role !== 'worker' || !user.workerId) {
      return { success: false, message: '您不是阿姨' };
    }

    const workerRes = await db.collection('workers').doc(user.workerId).get();
    const workerInfo = workerRes.data;
    if (workerInfo) {
      workerInfo.maskedName = maskName(workerInfo.name);
    }

    return { success: true, data: workerInfo, message: '获取成功' };
  } catch (error) {
    console.error('getMyWorkerInfo函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function updateMyWorkerInfo(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];

    if (user.role !== 'worker' || !user.workerId) {
      return { success: false, message: '您不是阿姨' };
    }

    const updateData = { updatedAt: db.serverDate() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;
    if (data.age !== undefined) updateData.age = data.age;
    if (data.hometown !== undefined) updateData.hometown = data.hometown;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.experience !== undefined) updateData.experience = data.experience;
    if (data.serviceTypes !== undefined) updateData.serviceTypes = data.serviceTypes;
    if (data.skills !== undefined) updateData.skills = data.skills;
    if (data.priceMonthly !== undefined || data.priceDaily !== undefined) {
      const workerRes = await db.collection('workers').doc(user.workerId).get();
      const oldPrice = workerRes.data && workerRes.data.price ? workerRes.data.price : {};
      updateData.price = {
        monthly: data.priceMonthly !== undefined ? data.priceMonthly : (oldPrice.monthly || 0),
        daily: data.priceDaily !== undefined ? data.priceDaily : (oldPrice.daily || 0)
      };
    }
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.isVerified !== undefined) updateData.isVerified = !!data.isVerified;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.acceptPreferences !== undefined) updateData.acceptPreferences = data.acceptPreferences;
    if (data.isPublic !== undefined) {
      updateData.isPublic = !!data.isPublic;
      updateData.status = data.isPublic ? 'available' : 'offline';
    }

    await db.collection('workers').doc(user.workerId).update({
      data: updateData
    });

    return { success: true, message: '更新成功' };
  } catch (error) {
    console.error('updateMyWorkerInfo函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function getMyWorkerSettings(openid) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];
    if (user.role !== 'worker' || !user.workerId) {
      return { success: false, message: '您不是阿姨' };
    }

    const workerRes = await db.collection('workers').doc(user.workerId).get();
    const worker = workerRes.data || {};
    return {
      success: true,
      data: {
        status: worker.status || 'offline',
        isPublic: !!worker.isPublic,
        isVerified: !!worker.isVerified,
        serviceTypes: worker.serviceTypes || [],
        acceptPreferences: worker.acceptPreferences || {
          serviceTypes: worker.serviceTypes || [],
          shiftType: 'daytime',
          weekDays: 'mon_fri',
          isLiveIn: false,
          hourlyStart: '09:00',
          hourlyEnd: '18:00',
          workTime: '',
          note: ''
        }
      },
      message: '获取成功'
    };
  } catch (error) {
    console.error('getMyWorkerSettings函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function updateMyWorkerSettings(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];
    if (user.role !== 'worker' || !user.workerId) {
      return { success: false, message: '您不是阿姨' };
    }

    const safeStatus = data && data.status === 'available' ? 'available' : 'offline';
    const safeIsPublic = safeStatus === 'available';
    const safePrefs = data && data.acceptPreferences ? data.acceptPreferences : {};
    const serviceTypes = Array.isArray(safePrefs.serviceTypes) ? safePrefs.serviceTypes : [];
    const finalStatus = safeStatus;

    await db.collection('workers').doc(user.workerId).update({
      data: {
        status: finalStatus,
        isPublic: safeIsPublic,
        acceptPreferences: {
          serviceTypes,
          shiftType: safePrefs.shiftType || 'daytime',
          weekDays: safePrefs.weekDays || 'mon_fri',
          isLiveIn: !!safePrefs.isLiveIn,
          hourlyStart: safePrefs.hourlyStart || '09:00',
          hourlyEnd: safePrefs.hourlyEnd || '18:00',
          workTime: safePrefs.workTime || '',
          note: safePrefs.note || ''
        },
        updatedAt: db.serverDate()
      }
    });

    return {
      success: true,
      message: '接单设置已更新'
    };
  } catch (error) {
    console.error('updateMyWorkerSettings函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function platformGetUsers(openid, data) {
  await assertPlatform(openid);
  const page = data && data.page ? Number(data.page) : 1;
  const limit = data && data.limit ? Number(data.limit) : 10;
  const keyword = data && data.keyword ? String(data.keyword).trim() : '';
  const role = data && data.role ? String(data.role).trim() : 'all';

  const where = {};
  if (role !== 'all') where.role = role;
  if (keyword) {
    const reg = db.RegExp({ regexp: keyword, options: 'i' });
    where.nickname = reg;
  }

  const listRes = await db.collection('users')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const countRes = await db.collection('users').where(where).count();

  const list = (listRes.data || []).map((item) => ({
    _id: item._id,
    openid: item.openid || '',
    nickname: item.nickname || '',
    avatar: item.avatar || '/images/default-avatar.png',
    phone: item.phone || '',
    role: item.role || 'user',
    workerId: item.workerId || '',
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }));

  return {
    success: true,
    data: {
      list,
      pagination: formatPagination(page, limit, countRes.total)
    },
    message: '获取成功'
  };
}

async function platformGetWorkers(openid, data) {
  await assertPlatform(openid);
  const page = data && data.page ? Number(data.page) : 1;
  const limit = data && data.limit ? Number(data.limit) : 10;
  const keyword = data && data.keyword ? String(data.keyword).trim() : '';
  const status = data && data.status ? String(data.status).trim() : 'all';

  const where = {};
  if (status !== 'all') where.status = status;
  if (keyword) {
    where.name = db.RegExp({ regexp: keyword, options: 'i' });
  }

  const listRes = await db.collection('workers')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const countRes = await db.collection('workers').where(where).count();

  const workerList = listRes.data || [];
  const workerIds = workerList.map((item) => item._id).filter(Boolean);
  let userMap = {};
  if (workerIds.length > 0) {
    const userRes = await db.collection('users')
      .where({
        role: 'worker',
        workerId: _.in(workerIds)
      })
      .field({ workerId: true, openid: true, nickname: true, phone: true, _id: true })
      .get();
    userMap = (userRes.data || []).reduce((acc, item) => {
      if (item && item.workerId) acc[item.workerId] = item;
      return acc;
    }, {});
  }

  const list = workerList.map((item) => {
    const userBind = userMap[item._id] || {};
    return {
      _id: item._id,
      name: item.name || '',
      avatar: item.avatar || '/images/default-avatar.png',
      phone: item.phone || '',
      status: item.status || 'offline',
      isPublic: !!item.isPublic,
      isVerified: !!item.isVerified,
      serviceTypes: item.serviceTypes || [],
      price: item.price || {},
      rating: item.rating || 0,
      orderCount: item.orderCount || 0,
      userOpenid: item.userOpenid || '',
      bindUserId: userBind._id || '',
      bindUserNickname: userBind.nickname || '',
      bindUserPhone: userBind.phone || '',
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    };
  });

  return {
    success: true,
    data: {
      list,
      pagination: formatPagination(page, limit, countRes.total)
    },
    message: '获取成功'
  };
}

async function platformSetWorkerPublic(openid, data) {
  await assertPlatform(openid);
  const workerId = data && data.workerId ? String(data.workerId).trim() : '';
  if (!workerId) return { success: false, message: 'workerId不能为空' };

  const isPublic = !!(data && data.isPublic);
  await db.collection('workers').doc(workerId).update({
    data: {
      isPublic,
      status: isPublic ? 'available' : 'offline',
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    data: { workerId, isPublic, status: isPublic ? 'available' : 'offline' },
    message: '更新成功'
  };
}

async function platformGetGrowthStats(openid, data) {
  await assertPlatform(openid);
  const rangeKey = data && data.rangeKey ? String(data.rangeKey) : 'recent';
  const startDate = parseRangeStart(rangeKey);

  const totalUsersRes = await db.collection('users').where({ role: _.neq('platform') }).count();
  const totalWorkersRes = await db.collection('workers').count();
  const newUsersRes = await db.collection('users').where({
    role: _.neq('platform'),
    createdAt: _.gte(startDate)
  }).count();
  const newWorkersRes = await db.collection('workers').where({
    createdAt: _.gte(startDate)
  }).count();

  return {
    success: true,
    data: {
      rangeKey,
      startDate,
      totalUsers: totalUsersRes.total,
      totalWorkers: totalWorkersRes.total,
      newUsers: newUsersRes.total,
      newWorkers: newWorkersRes.total
    },
    message: '获取成功'
  };
}

async function platformSetUserRole(openid, data) {
  await assertPlatform(openid);
  const userId = data && data.userId ? String(data.userId).trim() : '';
  const nextRole = data && data.role ? String(data.role).trim() : '';
  const allowRoles = ['user', 'worker', 'platform'];
  if (!userId) return { success: false, message: 'userId不能为空' };
  if (!allowRoles.includes(nextRole)) return { success: false, message: '角色不合法' };

  const userRes = await db.collection('users').doc(userId).get();
  const target = userRes && userRes.data ? userRes.data : null;
  if (!target) return { success: false, message: '用户不存在' };

  let workerId = target.workerId || '';
  if (nextRole === 'worker') {
    if (!workerId) {
      const byOpenid = await db.collection('workers')
        .where({ userOpenid: target.openid || '' })
        .field({ _id: true })
        .limit(1)
        .get();
      if (byOpenid.data && byOpenid.data.length > 0) {
        workerId = byOpenid.data[0]._id;
      }
    }
    if (!workerId) {
      return { success: false, message: '该用户未绑定阿姨档案，无法设为worker' };
    }
  }

  const patch = {
    role: nextRole,
    updatedAt: db.serverDate()
  };
  if (nextRole === 'worker') {
    patch.workerId = workerId;
  }

  await db.collection('users').doc(userId).update({ data: patch });

  return {
    success: true,
    data: {
      userId,
      role: nextRole,
      workerId: nextRole === 'worker' ? workerId : (target.workerId || '')
    },
    message: '角色已更新'
  };
}
