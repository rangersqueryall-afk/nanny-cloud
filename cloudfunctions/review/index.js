/**
 * 评价云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { action, data } = event;
  const OPENID = cloud.getWXContext().OPENID;

  try {
    if (action === 'getList') {
      return await getList(data);
    } else if (action === 'create') {
      return await create(OPENID, data);
    } else if (action === 'getTags') {
      return await getTags();
    } else {
      return { success: false, message: '未知操作' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

async function getList(data) {
  const workerId = data && data.workerId ? data.workerId : '';
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  const where = {};
  if (workerId) {
    where.workerId = workerId;
  }

  const reviewRes = await db.collection('reviews')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  const countRes = await db.collection('reviews').where(where).count();

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

async function create(openid, data) {
  const orderRes = await db.collection('orders')
    .where({ _id: data.orderId, userOpenid: openid })
    .get();

  if (orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' };
  }

  const order = orderRes.data[0];
  if (order.status !== 'completed') {
    return { success: false, message: '只能评价已完成的订单' };
  }

  const workerRes = await db.collection('workers').doc(data.workerId).get();
  if (!workerRes.data) {
    return { success: false, message: '阿姨不存在' };
  }

  const existRes = await db.collection('reviews')
    .where({ orderId: data.orderId })
    .get();

  if (existRes.data.length > 0) {
    return { success: false, message: '该订单已经评价过了' };
  }

  const reviewData = {
    orderId: data.orderId,
    userOpenid: openid,
    workerId: data.workerId,
    rating: parseInt(data.rating),
    tags: data.tags ? data.tags : [],
    content: data.content ? data.content : '',
    createdAt: db.serverDate()
  };

  const addRes = await db.collection('reviews').add({ data: reviewData });

  // 更新阿姨评分
  const allReviews = await db.collection('reviews')
    .where({ workerId: data.workerId })
    .get();

  let totalRating = 0;
  for (let i = 0; i < allReviews.data.length; i++) {
    totalRating += allReviews.data[i].rating;
  }
  const averageRating = (totalRating / allReviews.data.length).toFixed(1);

  await db.collection('workers').doc(data.workerId).update({
    data: {
      rating: parseFloat(averageRating),
      reviewCount: allReviews.data.length
    }
  });

  return {
    success: true,
    data: { _id: addRes._id },
    message: '评价提交成功'
  };
}

async function getTags() {
  const tags = [
    { id: 'professional', name: '专业', count: 256 },
    { id: 'careful', name: '细心', count: 189 },
    { id: 'responsible', name: '负责', count: 167 },
    { id: 'patient', name: '有耐心', count: 145 },
    { id: 'experienced', name: '经验丰富', count: 134 },
    { id: 'cooking', name: '做饭好吃', count: 123 },
    { id: 'clean', name: '爱干净', count: 98 },
    { id: 'ontime', name: '守时', count: 87 },
    { id: 'gentle', name: '温和', count: 76 },
    { id: 'skilled', name: '技术好', count: 65 }
  ];

  return { success: true, data: tags, message: '获取成功' };
}
