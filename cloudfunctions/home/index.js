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

  if (bannerRes.data.length === 0) {
    return {
      success: true,
      data: [
        {
          id: 'b001',
          imageUrl: '/images/banner1.jpg',
          title: '专业保姆服务',
          subtitle: '8年经验，贴心呵护',
          link: '/pages/workers/workers?type=babysitter'
        },
        {
          id: 'b002',
          imageUrl: '/images/banner2.jpg',
          title: '专业育儿嫂',
          subtitle: '科学育儿，陪伴成长',
          link: '/pages/workers/workers?type=nanny'
        },
        {
          id: 'b003',
          imageUrl: '/images/banner3.jpg',
          title: '金牌月嫂',
          subtitle: '产后护理，月子餐制作',
          link: '/pages/workers/workers?type=maternity'
        }
      ],
      message: '获取成功'
    };
  }

  return { success: true, data: bannerRes.data, message: '获取成功' };
}

async function getRecommendations(data) {
  const limit = data && data.limit ? data.limit : 6;

  try {
    const workerRes = await db.collection('workers')
      .where({ isPublic: true, isVerified: true })
      .orderBy('rating', 'desc')
      .limit(limit)
      .get();

    // 如果数据库没有数据，返回 mock 数据
    if (workerRes.data.length === 0) {
      return { success: true, data: getMockWorkers(limit), message: '获取成功' };
    }

    return { success: true, data: workerRes.data, message: '获取成功' };
  } catch (error) {
    // 数据库查询失败，返回 mock 数据
    console.log('数据库查询失败，返回 mock 数据:', error);
    return { success: true, data: getMockWorkers(limit), message: '获取成功' };
  }
}

// Mock 阿姨数据
function getMockWorkers(limit) {
  const mockWorkers = [
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
  return mockWorkers.slice(0, limit);
}

async function getServiceTypes() {
  const typeRes = await db.collection('serviceTypes')
    .where({ isActive: true })
    .orderBy('sortOrder', 'asc')
    .get();

  if (typeRes.data.length === 0) {
    return {
      success: true,
      data: [
        { id: 'babysitter', name: '保姆', icon: '/images/icon-babysitter.png', description: '日常家务、做饭、照顾家人', priceRange: '6000-8000元/月' },
        { id: 'nanny', name: '育儿嫂', icon: '/images/icon-nanny.png', description: '婴幼儿护理、早教启蒙', priceRange: '7500-10000元/月' },
        { id: 'maternity', name: '月嫂', icon: '/images/icon-maternity.png', description: '产妇护理、月子餐、新生儿护理', priceRange: '9800-15000元/月' },
        { id: 'hourly', name: '钟点工', icon: '/images/icon-hourly.png', description: '按小时计费，灵活安排', priceRange: '35-50元/小时' },
        { id: 'elderly', name: '老人陪护', icon: '/images/icon-elderly.png', description: '陪伴老人、日常照料', priceRange: '5000-7000元/月' }
      ],
      message: '获取成功'
    };
  }

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
