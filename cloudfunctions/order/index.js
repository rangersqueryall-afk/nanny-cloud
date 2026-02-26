/**
 * 订单云函数
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
  const { action, data } = event;
  const OPENID = cloud.getWXContext().OPENID;

  try {
    if (action === 'getList') {
      return await getList(OPENID, data);
    } else if (action === 'getDetail') {
      return await getDetail(OPENID, data);
    } else if (action === 'create') {
      return await create(OPENID, data);
    } else if (action === 'cancel') {
      return await cancel(OPENID, data);
    } else if (action === 'complete') {
      return await complete(OPENID, data);
    } else if (action === 'getStats') {
      return await getStats(OPENID, data);
    } else {
      return { success: false, message: '未知操作' };
    }
  } catch (error) {
    return { success: false, message: error.message };
  }
};

async function getList(openid, data) {
  const status = data && data.status ? data.status : 'all';
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  const where = { userOpenid: openid };
  
  // 状态筛选：pending 表示待服务（包含 pending 和 confirmed）
  if (status !== 'all') {
    if (status === 'pending') {
      where.status = db.command.in(['pending', 'confirmed']);
    } else {
      where.status = status;
    }
  }

  const orderRes = await db.collection('orders')
    .where(where)
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * limit)
    .limit(limit)
    .get();

  const countRes = await db.collection('orders').where(where).count();

  const list = [];
  for (let i = 0; i < orderRes.data.length; i++) {
    const order = orderRes.data[i];
    let workerName = '未知阿姨';
    let workerAvatar = '/images/default-avatar.png';
    
    try {
      const workerRes = await db.collection('workers').doc(order.workerId).get();
      const worker = workerRes.data;
      if (worker) {
        workerName = maskName(worker.name);
        workerAvatar = worker.avatar;
      }
    } catch (e) {
      console.log('获取阿姨信息失败:', e);
    }
    
    list.push({
      _id: order._id,
      workerId: order.workerId,
      workerName: workerName,
      workerAvatar: workerAvatar,
      serviceType: order.serviceType,
      startDate: order.startDate,
      endDate: order.endDate,
      price: order.price,
      status: order.status,
      createdAt: order.createdAt
    });
  }

  return {
    success: true,
    data: {
      list: list,
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

async function getDetail(openid, data) {
  const id = data.id;
  const orderRes = await db.collection('orders')
    .where({ _id: id, userOpenid: openid })
    .get();

  if (orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' };
  }

  const order = orderRes.data[0];
  const workerRes = await db.collection('workers').doc(order.workerId).get();
  const worker = workerRes.data;

  return {
    success: true,
    data: {
      _id: order._id,
      workerId: order.workerId,
      workerName: worker ? worker.name : '未知阿姨',
      workerAvatar: worker ? worker.avatar : '/images/default-avatar.png',
      workerPhone: worker ? worker.phone : '',
      serviceType: order.serviceType,
      startDate: order.startDate,
      endDate: order.endDate,
      address: order.address,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      remark: order.remark,
      price: order.price,
      status: order.status,
      createdAt: order.createdAt
    },
    message: '获取成功'
  };
}

async function create(openid, data) {
  const workerRes = await db.collection('workers').doc(data.workerId).get();
  if (!workerRes.data) {
    return { success: false, message: '阿姨不存在' };
  }

  const worker = workerRes.data;
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  const price = worker.price.daily * days;

  const orderData = {
    userOpenid: openid,
    workerId: data.workerId,
    serviceType: data.serviceType,
    startDate: data.startDate,
    endDate: data.endDate,
    address: data.address,
    contactName: data.contactName,
    contactPhone: data.contactPhone,
    remark: data.remark ? data.remark : '',
    price: price,
    status: 'pending',
    createdAt: db.serverDate(),
    updatedAt: db.serverDate()
  };

  const addRes = await db.collection('orders').add({ data: orderData });

  return {
    success: true,
    data: {
      _id: addRes._id,
      price: price
    },
    message: '订单创建成功'
  };
}

async function cancel(openid, data) {
  const id = data.id;
  const orderRes = await db.collection('orders')
    .where({ _id: id, userOpenid: openid })
    .get();

  if (orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' };
  }

  const order = orderRes.data[0];
  if (order.status !== 'pending' && order.status !== 'confirmed') {
    return { success: false, message: '当前订单状态不能取消' };
  }

  await db.collection('orders').doc(id).update({
    data: {
      status: 'cancelled',
      updatedAt: db.serverDate()
    }
  });

  return { success: true, message: '订单取消成功' };
}

async function complete(openid, data) {
  const id = data.id;
  const orderRes = await db.collection('orders')
    .where({ _id: id, userOpenid: openid })
    .get();

  if (orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' };
  }

  const order = orderRes.data[0];
  if (order.status !== 'in_service') {
    return { success: false, message: '当前订单状态不能确认完成' };
  }

  await db.collection('orders').doc(id).update({
    data: {
      status: 'completed',
      updatedAt: db.serverDate()
    }
  });

  return { success: true, message: '订单确认完成成功' };
}

async function getStats(openid, data) {
  // 获取全部订单数量
  const allCount = await db.collection('orders')
    .where({ userOpenid: openid })
    .count();
  
  // 获取待服务订单数量（pending + confirmed）
  const pendingCount = await db.collection('orders')
    .where({
      userOpenid: openid,
      status: db.command.in(['pending', 'confirmed'])
    })
    .count();
  
  // 获取服务中订单数量
  const servingCount = await db.collection('orders')
    .where({
      userOpenid: openid,
      status: 'in_service'
    })
    .count();
  
  // 获取已完成订单数量
  const completedCount = await db.collection('orders')
    .where({
      userOpenid: openid,
      status: 'completed'
    })
    .count();
  
  return {
    success: true,
    data: {
      all: allCount.total,
      pending: pendingCount.total,
      serving: servingCount.total,
      completed: completedCount.total
    },
    message: '获取成功'
  };
}
