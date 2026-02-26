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
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  try {
    const where = { isPublic: true, isVerified: true };
    
    // 服务类型筛选
    if (data && data.type && data.type !== 'all' && data.type !== '') {
      where.serviceTypes = data.type;
    }
    
    // 价格范围筛选
    if (data && data.minPrice !== undefined && data.maxPrice !== undefined) {
      where['price.monthly'] = db.command.gte(data.minPrice).and(db.command.lte(data.maxPrice));
    }
    
    // 经验筛选
    if (data && data.minExperience !== undefined) {
      where.experience = db.command.gte(data.minExperience);
    }

    const workerRes = await db.collection('workers')
      .where(where)
      .orderBy('rating', 'desc')
      .skip((page - 1) * limit)
      .limit(limit)
      .get();

    // 如果数据库没有数据，返回 mock 数据（带筛选）
    if (workerRes.data.length === 0) {
      return { success: true, data: getMockWorkerList(page, limit, data), message: '获取成功' };
    }

    const maskedList = [];
    for (let i = 0; i < workerRes.data.length; i++) {
      const worker = workerRes.data[i];
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

    const countRes = await db.collection('workers').where(where).count();

    return {
      success: true,
      data: {
        list: maskedList,
        pagination: {
          page: page,
          limit: limit,
          total: countRes.total,
          totalPages: Math.ceil(countRes.total / limit)
        }
      },
      message: '获取成功'
    };
  } catch (error) {
    // 数据库查询失败，返回 mock 数据
    console.log('数据库查询失败，返回 mock 数据:', error);
    return { success: true, data: getMockWorkerList(page, limit, data), message: '获取成功' };
  }
}

// Mock 阿姨列表数据
function getMockWorkerList(page, limit, data) {
  const allWorkers = [
    {
      _id: 'w001',
      name: '王**',
      avatar: '/images/worker-1.jpg',
      age: 45,
      hometown: '安徽合肥',
      experience: 8,
      serviceTypes: ['babysitter', 'nanny'],
      price: { daily: 280, monthly: 7500 },
      skills: ['婴儿护理', '辅食制作', '早教启蒙', '家务清洁'],
      rating: 4.9,
      reviewCount: 128
    },
    {
      _id: 'w002',
      name: '李**',
      avatar: '/images/worker-2.jpg',
      age: 52,
      hometown: '江苏南京',
      experience: 12,
      serviceTypes: ['maternity', 'babysitter'],
      price: { daily: 350, monthly: 9800 },
      skills: ['产妇护理', '新生儿护理', '月子餐', '催乳'],
      rating: 5.0,
      reviewCount: 89
    },
    {
      _id: 'w003',
      name: '张**',
      avatar: '/images/worker-3.jpg',
      age: 38,
      hometown: '浙江杭州',
      experience: 5,
      serviceTypes: ['nanny'],
      price: { daily: 220, monthly: 6000 },
      skills: ['家务清洁', '烹饪', '接送孩子', '陪伴老人'],
      rating: 4.7,
      reviewCount: 56
    },
    {
      _id: 'w004',
      name: '陈**',
      avatar: '/images/worker-4.jpg',
      age: 48,
      hometown: '四川成都',
      experience: 10,
      serviceTypes: ['babysitter', 'nanny'],
      price: { daily: 300, monthly: 8000 },
      skills: ['婴儿护理', '早教', '辅食制作', '家务清洁', '烹饪'],
      rating: 4.8,
      reviewCount: 95
    },
    {
      _id: 'w005',
      name: '刘**',
      avatar: '/images/worker-5.jpg',
      age: 42,
      hometown: '湖南长沙',
      experience: 6,
      serviceTypes: ['maternity'],
      price: { daily: 380, monthly: 10800 },
      skills: ['产妇护理', '新生儿护理', '月子餐', '产后恢复'],
      rating: 4.9,
      reviewCount: 67
    },
    {
      _id: 'w006',
      name: '赵**',
      avatar: '/images/default-avatar.png',
      age: 55,
      hometown: '山东青岛',
      experience: 15,
      serviceTypes: ['nanny'],
      price: { daily: 250, monthly: 6800 },
      skills: ['家务清洁', '烹饪', '照顾老人', '收纳整理'],
      rating: 4.6,
      reviewCount: 112
    }
  ];

  let filteredWorkers = allWorkers;
  
  // 服务类型筛选
  const type = data && data.type;
  if (type && type !== 'all' && type !== '') {
    filteredWorkers = filteredWorkers.filter(w => w.serviceTypes.includes(type));
  }
  
  // 价格范围筛选
  if (data && data.minPrice !== undefined && data.maxPrice !== undefined) {
    filteredWorkers = filteredWorkers.filter(w => {
      const monthlyPrice = w.price && w.price.monthly ? w.price.monthly : 0;
      return monthlyPrice >= data.minPrice && monthlyPrice <= data.maxPrice;
    });
  }
  
  // 经验筛选
  if (data && data.minExperience !== undefined) {
    filteredWorkers = filteredWorkers.filter(w => w.experience >= data.minExperience);
  }

  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const list = filteredWorkers.slice(startIndex, endIndex);

  return {
    list: list,
    pagination: {
      page: page,
      limit: limit,
      total: filteredWorkers.length,
      totalPages: Math.ceil(filteredWorkers.length / limit)
    }
  };
}

async function getDetail(data) {
  const id = data.id;
  try {
    const workerRes = await db.collection('workers').doc(id).get();
    const worker = workerRes.data;

    if (!worker) {
      throw new Error('not_found');
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
  } catch (error) {
    console.log('getDetail 查询数据库失败，尝试返回 mock 数据:', error);
    const mockWorker = getMockWorkerDetailById(id);
    if (!mockWorker) {
      return { success: false, message: '阿姨不存在' };
    }
    return {
      success: true,
      data: mockWorker,
      message: '获取成功(mock)'
    };
  }
}

function getMockWorkerDetailById(id) {
  const list = getMockWorkerList(1, 100, {});
  const worker = list.list.find(item => String(item._id) === String(id));
  if (!worker) return null;

  return {
    _id: worker._id,
    name: worker.name,
    avatar: worker.avatar,
    age: worker.age,
    hometown: worker.hometown,
    experience: worker.experience,
    serviceTypes: worker.serviceTypes,
    price: worker.price,
    skills: worker.skills,
    bio: '从业经验丰富，服务认真负责，注重沟通和细节。',
    rating: worker.rating,
    reviewCount: worker.reviewCount,
    orderCount: 60 + (parseInt(String(id).replace(/\D/g, ''), 10) || 1) * 3,
    isVerified: true
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

  try {
    const workerRes = await db.collection('workers').doc(workerId).get();
    if (workerRes && workerRes.data) {
      workerName = maskName(workerRes.data.name || workerName);
      workerAvatar = workerRes.data.avatar || workerAvatar;
    }
  } catch (error) {
    console.log('收藏时未查询到阿姨主表，使用前端透传数据兜底:', error);
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

async function bookWorker(openid, data) {
  const userRes = await db.collection('users').where({ openid: openid }).get();
  if (userRes.data.length === 0) {
    return { success: false, message: '用户不存在' };
  }
  const user = userRes.data[0];

  const workerRes = await db.collection('workers').doc(data.workerId).get();
  if (!workerRes.data) {
    return { success: false, message: '阿姨不存在' };
  }
  const worker = workerRes.data;

  const bookingData = {
    userOpenid: openid,
    userNickname: user.nickname,
    userPhone: user.phone,
    workerId: data.workerId,
    workerName: worker.name,
    workerPhone: worker.phone,
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
