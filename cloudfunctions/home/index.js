/**
 * 首页云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { action, data } = event;

  try {
    if (action === 'getBanners') {
      return await getBanners();
    } else if (action === 'getRecommendations') {
      return await getRecommendations(data);
    } else if (action === 'getServiceTypes') {
      return await getServiceTypes();
    } else if (action === 'getStatistics') {
      return await getStatistics();
    } else if (action === 'search') {
      return await search(data);
    } else {
      return { success: false, message: '未知操作' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

async function getBanners() {
  const bannerRes = await db.collection('banners')
    .where({ isActive: true })
    .orderBy('sortOrder', 'asc')
    .get();

  return { success: true, data: bannerRes.data, message: '获取成功' };
}

async function getRecommendations(data) {
  const limit = data && data.limit ? data.limit : 6;

  const workerRes = await db.collection('workers')
    .where({ isPublic: true, isVerified: true })
    .orderBy('rating', 'desc')
    .limit(limit)
    .get();

  return { success: true, data: workerRes.data, message: '获取成功' };
}

async function getServiceTypes() {
  const typeRes = await db.collection('serviceTypes')
    .where({ isActive: true })
    .orderBy('sortOrder', 'asc')
    .get();

  return { success: true, data: typeRes.data, message: '获取成功' };
}

async function getStatistics() {
  const workerCount = await db.collection('workers').count();
  const orderCount = await db.collection('orders').count();
  const userCount = await db.collection('users').count();

  return {
    success: true,
    data: {
      workerCount: workerCount.total,
      orderCount: orderCount.total,
      userCount: userCount.total,
      satisfactionRate: 98.5
    },
    message: '获取成功'
  };
}

async function search(data) {
  const keyword = data.keyword;
  const page = data.page ? data.page : 1;
  const limit = data.limit ? data.limit : 10;

  if (!keyword || keyword.trim() === '') {
    return { success: false, message: '搜索关键词不能为空' };
  }

  const workerRes = await db.collection('workers')
    .where({
      isPublic: true,
      isVerified: true,
      name: db.RegExp({ regexp: keyword, options: 'i' })
    })
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  const countRes = await db.collection('workers')
    .where({
      isPublic: true,
      isVerified: true,
      name: db.RegExp({ regexp: keyword, options: 'i' })
    })
    .count();

  return {
    success: true,
    data: {
      list: workerRes.data,
      pagination: {
        page: page,
        limit: limit,
        total: countRes.total,
        totalPages: Math.ceil(countRes.total / limit)
      }
    },
    message: '搜索成功'
  };
}
