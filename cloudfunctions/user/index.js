/**
 * 用户云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 脱敏姓名
function maskName(name) {
  if (!name || name.length === 0) return '**';
  if (name.length === 1) return name + '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '**';
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
    } else if (action === 'registerWorker') {
      return await registerWorker(OPENID, data);
    } else if (action === 'updateWorkerStatus') {
      return await updateWorkerStatus(OPENID, data);
    } else if (action === 'getMyWorkerInfo') {
      return await getMyWorkerInfo(OPENID);
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

    let workerInfo = null;
    if (user.role === 'worker' && user.workerId) {
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
          role: user.role,
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

    let workerInfo = null;
    if (user.role === 'worker' && user.workerId) {
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
        role: user.role,
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
    const updateData = { updatedAt: db.serverDate() };
    if (data.nickname) updateData.nickname = data.nickname;
    if (data.avatar) updateData.avatar = data.avatar;
    if (data.phone) updateData.phone = data.phone;

    await db.collection('users').where({ openid: openid }).update({ data: updateData });

    return { success: true, data: updateData, message: '更新成功' };
  } catch (error) {
    console.error('updateProfile函数错误:', error);
    return { success: false, message: error.message };
  }
}

async function registerWorker(openid, data) {
  try {
    const userRes = await db.collection('users').where({ openid: openid }).get();
    if (userRes.data.length === 0) {
      return { success: false, message: '用户不存在' };
    }
    const user = userRes.data[0];

    if (user.role === 'worker') {
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
