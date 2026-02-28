/**
 * 阿姨云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

const ACTIVE_BOOKING_STATUS = ['pending', 'accepted', 'interview_scheduled', 'interview_passed'];
const EMPLOYER_CANCELABLE_STATUS = ['pending', 'accepted', 'interview_scheduled', 'interview_passed'];

function maskName(name) {
  if (!name || name.length === 0) return '**';
  if (name.length === 1) return name + '*';
  if (name.length === 2) return name[0] + '*';
  return name[0] + '**';
}

async function findWorkerById(workerId) {
  if (!workerId) return null;

  try {
    const docRes = await db.collection('workers').doc(workerId).get();
    if (docRes && docRes.data) return docRes.data;
  } catch (e) {}

  try {
    const byUnderscoreId = await db.collection('workers').where({ _id: workerId }).limit(1).get();
    if (byUnderscoreId.data.length > 0) return byUnderscoreId.data[0];
  } catch (e) {}

  try {
    const byId = await db.collection('workers').where({ id: workerId }).limit(1).get();
    if (byId.data.length > 0) return byId.data[0];
  } catch (e) {}

  return null;
}

async function getUserByOpenid(openid) {
  const userRes = await db.collection('users').where({ openid }).limit(1).get();
  if (!userRes.data || userRes.data.length === 0) return null;
  return userRes.data[0];
}

async function getRoleByOpenid(openid) {
  const user = await getUserByOpenid(openid);
  const role = user && user.role ? user.role : 'user';
  return {
    user,
    role,
    isPlatform: role === 'platform',
    isWorker: role === 'worker'
  };
}

function normalizeBookingOwnerQuery(openid) {
  return _.or([{ employerOpenid: openid }, { userOpenid: openid }]);
}

async function getBookingById(bookingId) {
  const res = await db.collection('bookings').where({ _id: bookingId }).limit(1).get();
  return res.data && res.data.length > 0 ? res.data[0] : null;
}

async function appendStatusHistory(booking, toStatus, operatorOpenid, operatorRole, remark) {
  const oldHistory = Array.isArray(booking.statusHistory) ? booking.statusHistory : [];
  const historyItem = {
    from: booking.status || '',
    to: toStatus,
    operator: operatorOpenid,
    operatorRole: operatorRole || 'system',
    remark: remark || '',
    time: new Date()
  };
  return oldHistory.concat(historyItem);
}

async function assertPlatform(openid) {
  const roleInfo = await getRoleByOpenid(openid);
  if (!roleInfo.user || !roleInfo.isPlatform) {
    throw new Error('仅平台可操作');
  }
  return roleInfo.user;
}

async function assertWorker(openid) {
  const roleInfo = await getRoleByOpenid(openid);
  if (!roleInfo.user || !roleInfo.isWorker || !roleInfo.user.workerId) {
    throw new Error('您不是阿姨');
  }
  return roleInfo.user;
}

async function assertEmployer(openid) {
  const roleInfo = await getRoleByOpenid(openid);
  if (!roleInfo.user || roleInfo.isWorker || roleInfo.isPlatform) {
    throw new Error('仅雇主可操作');
  }
  return roleInfo.user;
}

function formatPagination(page, limit, total) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  };
}

exports.main = async (event, context) => {
  const { action, data } = event;
  const OPENID = cloud.getWXContext().OPENID;

  try {
    if (action === 'getList') return await getList(data);
    if (action === 'getDetail') return await getDetail(data);
    if (action === 'getReviews') return await getReviews(data);
    if (action === 'addFavorite') return await addFavorite(OPENID, data);
    if (action === 'removeFavorite') return await removeFavorite(OPENID, data);
    if (action === 'checkFavorite') return await checkFavorite(OPENID, data);
    if (action === 'getFavorites') return await getFavorites(OPENID, data);
    if (action === 'bookWorker') return await bookWorker(OPENID, data);
    if (action === 'getMyBookings') return await getMyBookings(OPENID, data);
    if (action === 'cancelBooking') return await cancelBooking(OPENID, data);
    if (action === 'terminateBooking') return await terminateBooking(OPENID, data);
    if (action === 'getWorkerBookings') return await getWorkerBookings(OPENID, data);
    if (action === 'getPlatformBookings') return await getPlatformBookings(OPENID, data);
    if (action === 'acceptBooking') return await acceptBooking(OPENID, data);
    if (action === 'rejectBooking') return await rejectBooking(OPENID, data);
    if (action === 'platformScheduleInterview') return await platformScheduleInterview(OPENID, data);
    if (action === 'platformSetInterviewResult') return await platformSetInterviewResult(OPENID, data);
    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: error.message };
  }
};

async function getList(data) {
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;
  const keyword = data && data.keyword ? String(data.keyword).trim() : '';
  const where = { isPublic: true };

  if (data && data.type && data.type !== 'all' && data.type !== '') {
    where.serviceTypes = _.all([data.type]);
  }
  if (data && data.minPrice !== undefined && data.maxPrice !== undefined) {
    where['price.monthly'] = _.gte(data.minPrice).and(_.lte(data.maxPrice));
  }
  if (data && data.minExperience !== undefined) {
    where.experience = _.gte(data.minExperience);
  }

  let sourceList = [];
  let total = 0;

  if (keyword) {
    const fullRes = await db.collection('workers').where(where).orderBy('rating', 'desc').limit(200).get();
    const lowerKeyword = keyword.toLowerCase();
    const matched = fullRes.data.filter((worker) => {
      const nameMatch = worker.name && String(worker.name).toLowerCase().includes(lowerKeyword);
      const hometownMatch = worker.hometown && String(worker.hometown).toLowerCase().includes(lowerKeyword);
      const skillMatch = Array.isArray(worker.skills) && worker.skills.some((s) => String(s).toLowerCase().includes(lowerKeyword));
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

  const maskedList = sourceList.map((worker) => ({
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
  }));

  return {
    success: true,
    data: {
      list: maskedList,
      pagination: formatPagination(page, limit, total)
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

  const reviewRes = await db.collection('reviews').where({ workerId: id }).orderBy('createdAt', 'desc').limit(5).get();
  maskedWorker.reviews = reviewRes.data;
  return { success: true, data: maskedWorker, message: '获取成功' };
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
      pagination: formatPagination(page, limit, countRes.total)
    },
    message: '获取成功'
  };
}

async function addFavorite(openid, data) {
  await assertEmployer(openid);
  const workerId = data.workerId;
  const existRes = await db.collection('favorites').where({ userOpenid: openid, workerId }).get();
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
      workerId,
      workerName,
      workerAvatar,
      createdAt: db.serverDate()
    }
  });
  return { success: true, message: '收藏成功' };
}

async function removeFavorite(openid, data) {
  await assertEmployer(openid);
  const workerId = data.workerId;
  await db.collection('favorites').where({ userOpenid: openid, workerId }).remove();
  return { success: true, message: '取消收藏成功' };
}

async function checkFavorite(openid, data) {
  await assertEmployer(openid);
  const workerId = data.workerId;
  const favRes = await db.collection('favorites').where({ userOpenid: openid, workerId }).get();
  return { success: true, data: { isFavorite: favRes.data.length > 0 }, message: '获取成功' };
}

async function getFavorites(openid, data) {
  await assertEmployer(openid);
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  const favRes = await db.collection('favorites')
    .where({ userOpenid: openid })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const countRes = await db.collection('favorites').where({ userOpenid: openid }).count();

  return {
    success: true,
    data: {
      list: favRes.data,
      pagination: formatPagination(page, limit, countRes.total)
    },
    message: '获取成功'
  };
}

async function getMyBookings(openid, data) {
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  const bookingRes = await db.collection('bookings')
    .where(normalizeBookingOwnerQuery(openid))
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const countRes = await db.collection('bookings').where(normalizeBookingOwnerQuery(openid)).count();

  return {
    success: true,
    data: {
      list: bookingRes.data,
      pagination: formatPagination(page, limit, countRes.total)
    },
    message: '获取成功'
  };
}

async function getWorkerBookings(openid, data) {
  const user = await assertWorker(openid);
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;
  const includeRejected = !!(data && data.includeRejected);
  const where = { workerId: user.workerId };

  if (!includeRejected) {
    where.status = _.neq('rejected');
  }

  const bookingRes = await db.collection('bookings')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const countRes = await db.collection('bookings').where(where).count();

  return {
    success: true,
    data: {
      list: bookingRes.data,
      pagination: formatPagination(page, limit, countRes.total)
    },
    message: '获取成功'
  };
}

async function getPlatformBookings(openid, data) {
  await assertPlatform(openid);
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;
  const filter = data && data.filter ? data.filter : 'all';
  const where = {};

  if (filter === 'accepted') {
    where.status = 'accepted';
  } else if (filter === 'interview_scheduled') {
    where.status = 'interview_scheduled';
  } else if (filter === 'done') {
    where.status = _.in(['interview_passed', 'interview_failed', 'order_created', 'terminated', 'cancelled_by_employer']);
  }

  const bookingRes = await db.collection('bookings')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();
  const countRes = await db.collection('bookings').where(where).count();

  return {
    success: true,
    data: {
      list: bookingRes.data,
      pagination: formatPagination(page, limit, countRes.total)
    },
    message: '获取成功'
  };
}

async function bookWorker(openid, data) {
  const user = await getUserByOpenid(openid);
  if (!user) return { success: false, message: '用户不存在' };

  const worker = await findWorkerById(data.workerId);
  if (!worker) {
    return { success: false, message: '阿姨不存在，请检查 workers 集合数据是否已导入当前云环境' };
  }

  const activeBookingRes = await db.collection('bookings')
    .where({
      workerId: worker._id || data.workerId,
      status: _.in(ACTIVE_BOOKING_STATUS)
    })
    .limit(1)
    .get();
  if (activeBookingRes.data.length > 0) {
    return { success: false, message: '该阿姨已被预约，请选择其他阿姨或稍后再试' };
  }

  const bookingData = {
    employerOpenid: openid,
    userOpenid: openid,
    userNickname: user.nickname,
    userPhone: user.phone,
    workerId: worker._id || data.workerId,
    workerName: worker.name,
    workerAvatar: worker.avatar || '/images/default-avatar.png',
    workerPhone: worker.phone || '',
    serviceType: data.serviceType || '',
    startDate: data.startDate || '',
    duration: data.duration || '',
    dailyHours: data.dailyHours || '',
    address: data.address || '',
    totalPrice: data.totalPrice || 0,
    contactName: data.contactName || '',
    contactPhone: data.contactPhone || '',
    remark: data.remark || '',
    rejectReason: '',
    platformNote: '',
    interviewTime: '',
    orderId: '',
    contractSigned: false,
    status: 'pending',
    statusHistory: [
      {
        from: '',
        to: 'pending',
        operator: openid,
        operatorRole: 'employer',
        remark: '雇主提交预约',
        time: new Date()
      }
    ],
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const bookingRes = await db.collection('bookings').add({ data: bookingData });
  return {
    success: true,
    data: { bookingId: bookingRes._id },
    message: '预约成功'
  };
}

async function cancelBooking(openid, data) {
  const bookingId = data && data.bookingId;
  if (!bookingId) return { success: false, message: '预约ID不能为空' };

  const booking = await getBookingById(bookingId);
  if (!booking) return { success: false, message: '预约不存在' };

  if (booking.employerOpenid !== openid && booking.userOpenid !== openid) {
    return { success: false, message: '无权限操作该预约' };
  }
  if (!EMPLOYER_CANCELABLE_STATUS.includes(booking.status)) {
    return { success: false, message: '当前状态不可取消预约' };
  }

  const statusHistory = await appendStatusHistory(booking, 'cancelled_by_employer', openid, 'employer', '雇主取消预约');
  await db.collection('bookings').doc(bookingId).update({
    data: {
      status: 'cancelled_by_employer',
      statusHistory,
      updatedAt: db.serverDate()
    }
  });
  return { success: true, message: '预约已取消' };
}

async function terminateBooking(openid, data) {
  const bookingId = data && data.bookingId;
  if (!bookingId) return { success: false, message: '预约ID不能为空' };

  const booking = await getBookingById(bookingId);
  if (!booking) return { success: false, message: '预约不存在' };

  const isOwner = booking.employerOpenid === openid || booking.userOpenid === openid;
  if (!isOwner) return { success: false, message: '无权限操作该预约' };
  if (!['accepted', 'interview_scheduled', 'interview_passed'].includes(booking.status)) {
    return { success: false, message: '当前状态不可终止预约' };
  }

  const statusHistory = await appendStatusHistory(booking, 'terminated', openid, 'employer', data && data.remark ? data.remark : '雇主终止预约');
  await db.collection('bookings').doc(bookingId).update({
    data: {
      status: 'terminated',
      statusHistory,
      updatedAt: db.serverDate()
    }
  });
  return { success: true, message: '预约已终止' };
}

async function acceptBooking(openid, data) {
  const workerUser = await assertWorker(openid);
  const bookingId = data && data.bookingId;
  if (!bookingId) return { success: false, message: '预约ID不能为空' };

  const booking = await getBookingById(bookingId);
  if (!booking) return { success: false, message: '预约不存在' };
  if (booking.workerId !== workerUser.workerId) return { success: false, message: '无权限处理该预约' };
  if (booking.status !== 'pending') return { success: false, message: '仅待处理预约可接受' };

  const statusHistory = await appendStatusHistory(booking, 'accepted', openid, 'worker', '阿姨接受预约');
  await db.collection('bookings').doc(bookingId).update({
    data: {
      status: 'accepted',
      rejectReason: '',
      statusHistory,
      updatedAt: db.serverDate()
    }
  });
  return { success: true, message: '已接受预约' };
}

async function rejectBooking(openid, data) {
  const workerUser = await assertWorker(openid);
  const bookingId = data && data.bookingId;
  if (!bookingId) return { success: false, message: '预约ID不能为空' };

  const booking = await getBookingById(bookingId);
  if (!booking) return { success: false, message: '预约不存在' };
  if (booking.workerId !== workerUser.workerId) return { success: false, message: '无权限处理该预约' };
  if (booking.status !== 'pending') return { success: false, message: '仅待处理预约可拒绝' };

  const reason = (data && data.reason) ? String(data.reason).trim() : '';
  const statusHistory = await appendStatusHistory(booking, 'rejected', openid, 'worker', reason || '阿姨拒绝预约');
  await db.collection('bookings').doc(bookingId).update({
    data: {
      status: 'rejected',
      rejectReason: reason,
      statusHistory,
      updatedAt: db.serverDate()
    }
  });
  return { success: true, message: '已拒绝预约' };
}

async function platformScheduleInterview(openid, data) {
  await assertPlatform(openid);
  const bookingId = data && data.bookingId;
  if (!bookingId) return { success: false, message: '预约ID不能为空' };

  const booking = await getBookingById(bookingId);
  if (!booking) return { success: false, message: '预约不存在' };
  if (booking.status !== 'accepted') return { success: false, message: '仅已接受预约可安排面试' };

  const note = (data && data.platformNote) ? String(data.platformNote).trim() : '';
  const interviewTime = (data && data.interviewTime) ? data.interviewTime : '';
  const statusHistory = await appendStatusHistory(booking, 'interview_scheduled', openid, 'platform', note || '平台安排面试');

  await db.collection('bookings').doc(bookingId).update({
    data: {
      status: 'interview_scheduled',
      interviewTime,
      platformNote: note,
      statusHistory,
      updatedAt: db.serverDate()
    }
  });

  return { success: true, message: '面试已安排' };
}

async function platformSetInterviewResult(openid, data) {
  await assertPlatform(openid);
  const bookingId = data && data.bookingId;
  if (!bookingId) return { success: false, message: '预约ID不能为空' };

  const booking = await getBookingById(bookingId);
  if (!booking) return { success: false, message: '预约不存在' };
  if (booking.status !== 'interview_scheduled') return { success: false, message: '仅已安排面试预约可设置结果' };

  const passed = !!(data && data.passed);
  const toStatus = passed ? 'interview_passed' : 'interview_failed';
  const note = (data && data.platformNote) ? String(data.platformNote).trim() : '';
  const statusHistory = await appendStatusHistory(booking, toStatus, openid, 'platform', note || (passed ? '面试通过' : '面试未通过'));

  await db.collection('bookings').doc(bookingId).update({
    data: {
      status: toStatus,
      platformNote: note,
      statusHistory,
      updatedAt: db.serverDate()
    }
  });
  return { success: true, message: passed ? '已标记面试通过' : '已标记面试未通过' };
}
