/**
 * 阿姨云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function maskName(name) {
  if (!name || name.length === 0) return '**';
  if (name.length === 1) return name + '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '**';
}

async function findWorkerById(workerId) {
  if (!workerId) return null;

  // 1) 优先按 _id 直查
  try {
    const docRes = await db.collection('workers').doc(workerId).get();
    if (docRes && docRes.data) return docRes.data;
  } catch (e) {
    // 忽略 document 不存在，继续尝试兼容查询
  }

  // 2) 兼容部分环境：where(_id)
  try {
    const byUnderscoreId = await db.collection('workers')
      .where({ _id: workerId })
      .limit(1)
      .get();
    if (byUnderscoreId.data.length > 0) return byUnderscoreId.data[0];
  } catch (e) {}

  // 3) 兼容导入为业务字段 id
  try {
    const byId = await db.collection('workers')
      .where({ id: workerId })
      .limit(1)
      .get();
    if (byId.data.length > 0) return byId.data[0];
  } catch (e) {}

  return null;
}

exports.main = async (event, context) => {
  const { action, data } = event;
  const OPENID = cloud.getWXContext().OPENID;

  try {
    if (action === 'getList') {
      return await getList(data);
    } else if (action === 'getDetail') {
      return await getDetail(data);
    } else if (action === 'getReviews') {
      return await getReviews(data);
    } else if (action === 'addFavorite') {
      return await addFavorite(OPENID, data);
    } else if (action === 'removeFavorite') {
      return await removeFavorite(OPENID, data);
    } else if (action === 'checkFavorite') {
      return await checkFavorite(OPENID, data);
    } else if (action === 'getFavorites') {
      return await getFavorites(OPENID, data);
    } else if (action === 'getMyBookings') {
      return await getMyBookings(OPENID, data);
    } else if (action === 'cancelBooking') {
      return await cancelBooking(OPENID, data);
    } else if (action === 'bookWorker') {
      return await bookWorker(OPENID, data);
    } else {
      return { success: false, message: '未知操作' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

async function getList(data) {
  const _ = db.command;
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;
  const keyword = data && data.keyword ? String(data.keyword).trim() : '';

  // 搜索页应支持所有公开阿姨
  const where = { isPublic: true };
  
  // 服务类型筛选
  if (data && data.type && data.type !== 'all' && data.type !== '') {
    // serviceTypes 为数组，使用 all([type]) 实现包含筛选
    where.serviceTypes = _.all([data.type]);
  }
  
  // 价格范围筛选
  if (data && data.minPrice !== undefined && data.maxPrice !== undefined) {
    where['price.monthly'] = _.gte(data.minPrice).and(_.lte(data.maxPrice));
  }
  
  // 经验筛选
  if (data && data.minExperience !== undefined) {
    where.experience = _.gte(data.minExperience);
  }

  let sourceList = [];
  let total = 0;

  if (keyword) {
    // 关键词搜索用内存过滤，避免受分页影响漏数据
    const fullRes = await db.collection('workers')
      .where(where)
      .orderBy('rating', 'desc')
      .limit(200)
      .get();

    const lowerKeyword = keyword.toLowerCase();
    const matched = fullRes.data.filter((worker) => {
      const nameMatch = worker.name && String(worker.name).toLowerCase().includes(lowerKeyword);
      const hometownMatch = worker.hometown && String(worker.hometown).toLowerCase().includes(lowerKeyword);
      const skillMatch = Array.isArray(worker.skills) && worker.skills.some(s => String(s).toLowerCase().includes(lowerKeyword));
      return nameMatch || hometownMatch || skillMatch;
    });

    total = matched.length;
    sourceList = matched.slice((page - 1) * limit, page * limit);
  } else {
    const workerRes = await db.collection('workers')
      .where(where)
      .orderBy('rating', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();
    sourceList = workerRes.data;
    const countRes = await db.collection('workers').where(where).count();
    total = countRes.total;
  }

  const maskedList = [];
  for (let i = 0; i < sourceList.length; i++) {
    const worker = sourceList[i];
    maskedList.push({
      _id: worker._id,
      name: maskName(worker.name),
      avatar: worker.avatar,
      age: worker.age,
      hometown: worker.hometown,
      experience: worker.experience,
      serviceTypes: worker.serviceTypes,
      price: worker.price,
      skills: worker.skills,
      rating: worker.rating,
      reviewCount: worker.reviewCount
    });
  }

  return {
    success: true,
    data: {
      list: maskedList,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    },
    message: '获取成功'
  };
}

async function getDetail(data) {
  const id = data.id;
  const worker = await findWorkerById(id);

  if (!worker) {
    return { success: false, message: '阿姨不存在，请检查 workers 集合数据是否已导入当前云环境' };
  }

  if (!worker.isPublic) {
    return { success: false, message: '该阿姨信息已隐藏' };
  }

  const maskedWorker = {
    _id: worker._id,
    name: maskName(worker.name),
    avatar: worker.avatar,
    age: worker.age,
    hometown: worker.hometown,
    experience: worker.experience,
    serviceTypes: worker.serviceTypes,
    price: worker.price,
    skills: worker.skills,
    bio: worker.bio,
    rating: worker.rating,
    reviewCount: worker.reviewCount
  };

  const reviewRes = await db.collection('reviews')
    .where({ workerId: id })
    .orderBy('createdAt', 'desc')
    .limit(5)
    .get();

  maskedWorker.reviews = reviewRes.data;
  return {
    success: true,
    data: maskedWorker,
    message: '获取成功'
  };
}

async function getReviews(data) {
  const id = data.id;
  const page = data.page ? data.page : 1;
  const limit = data.limit ? data.limit : 10;

  const reviewRes = await db.collection('reviews')
    .where({ workerId: id })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  const countRes = await db.collection('reviews').where({ workerId: id }).count();

  return {
    success: true,
    data: {
      list: reviewRes.data,
      pagination: {
        page: page,
        limit: limit,
        total: countRes.total,
        totalPages: Math.ceil(countRes.total / limit)
      }
    },
    message: '获取成功'
  };
}

async function addFavorite(openid, data) {
  const workerId = data.workerId;

  const existRes = await db.collection('favorites')
    .where({ userOpenid: openid, workerId: workerId })
    .get();

  if (existRes.data.length > 0) {
    return { success: false, message: '已经收藏过该阿姨' };
  }

  let workerName = data && data.workerName ? data.workerName : '阿姨';
  let workerAvatar = data && data.workerAvatar ? data.workerAvatar : '/images/default-avatar.png';

  const worker = await findWorkerById(workerId);
  if (worker) {
    workerName = maskName(worker.name || workerName);
    workerAvatar = worker.avatar || workerAvatar;
  }

  await db.collection('favorites').add({
    data: {
      userOpenid: openid,
      workerId: workerId,
      workerName: workerName,
      workerAvatar: workerAvatar,
      createdAt: db.serverDate()
    }
  });

  return { success: true, message: '收藏成功' };
}

async function removeFavorite(openid, data) {
  const workerId = data.workerId;
  await db.collection('favorites')
    .where({ userOpenid: openid, workerId: workerId })
    .remove();
  return { success: true, message: '取消收藏成功' };
}

async function checkFavorite(openid, data) {
  const workerId = data.workerId;
  const favRes = await db.collection('favorites')
    .where({ userOpenid: openid, workerId: workerId })
    .get();

  return {
    success: true,
    data: { isFavorite: favRes.data.length > 0 },
    message: '获取成功'
  };
}

async function getFavorites(openid, data) {
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  const favRes = await db.collection('favorites')
    .where({ userOpenid: openid })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  const countRes = await db.collection('favorites')
    .where({ userOpenid: openid })
    .count();

  return {
    success: true,
    data: {
      list: favRes.data,
      pagination: {
        page,
        limit,
        total: countRes.total,
        totalPages: Math.ceil(countRes.total / limit)
      }
    },
    message: '获取成功'
  };
}

async function getMyBookings(openid, data) {
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  const bookingRes = await db.collection('bookings')
    .where({ userOpenid: openid })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  const countRes = await db.collection('bookings')
    .where({ userOpenid: openid })
    .count();

  return {
    success: true,
    data: {
      list: bookingRes.data,
      pagination: {
        page,
        limit,
        total: countRes.total,
        totalPages: Math.ceil(countRes.total / limit)
      }
    },
    message: '获取成功'
  };
}

async function bookWorker(openid, data) {
  const userRes = await db.collection('users').where({ openid: openid }).get();
  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' };
  }
  const user = userRes.data[0];

  const worker = await findWorkerById(data.workerId);
  if (!worker) {
    return { success: false, message: '阿姨不存在，请检查 workers 集合数据是否已导入当前云环境' };
  }

  // 进行中的预约占用校验：未取消的预约不可重复预约同一位阿姨
  const activeBookingRes = await db.collection('bookings')
    .where({
      workerId: data.workerId,
      status: db.command.in(['pending', 'confirmed'])
    })
    .limit(1)
    .get();
  if (activeBookingRes.data.length > 0) {
    return { success: false, message: '该阿姨已被预约，请选择其他阿姨或稍后再试' };
  }

  const bookingData = {
      userOpenid: openid,
      userNickname: user.nickname,
      userPhone: user.phone,
    workerId: worker._id || data.workerId,
    workerName: worker.name,
    workerAvatar: worker.avatar || '/images/default-avatar.png',
    workerPhone: worker.phone,
    serviceType: data.serviceType || '',
    startDate: data.startDate || '',
    duration: data.duration || '',
    dailyHours: data.dailyHours || '',
    address: data.address || '',
    totalPrice: data.totalPrice || 0,
    contactName: data.contactName,
    contactPhone: data.contactPhone,
    remark: data.remark ? data.remark : '',
    status: 'pending',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const bookingRes = await db.collection('bookings').add({ data: bookingData });

  return {
    success: true,
    data: {
      bookingId: bookingRes._id,
      message: '预约成功，我们会尽快联系您安排面试'
    },
    message: '预约成功'
  };
}

async function cancelBooking(openid, data) {
  const bookingId = data && data.bookingId;
  if (!bookingId) {
    return { success: false, message: '预约ID不能为空' };
  }

  const bookingRes = await db.collection('bookings')
    .where({ _id: bookingId, userOpenid: openid })
    .limit(1)
    .get();

  if (bookingRes.data.length === 0) {
    return { success: false, message: '预约不存在' };
  }

  const booking = bookingRes.data[0];
  if (booking.status === 'cancelled') {
    return { success: false, message: '该预约已取消' };
  }

  await db.collection('bookings').doc(bookingId).update({
    data: {
      status: 'cancelled',
      updatedAt: db.serverDate()
    }
  });

  return { success: true, message: '预约已取消' };
}
