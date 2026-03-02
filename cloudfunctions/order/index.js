/**
 * 订单云函数
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
    } else if (action === 'createFromBooking') {
      return await createFromBooking(OPENID, data);
    } else if (action === 'payOrder') {
      return await payOrder(OPENID, data);
    } else if (action === 'confirmPaid') {
      return await confirmPaid(OPENID, data);
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

async function findWorkerById(workerId) {
  if (!workerId) return null;
  try {
    const byDoc = await db.collection('workers').doc(workerId).get();
    if (byDoc && byDoc.data) return byDoc.data;
  } catch (e) {}
  try {
    const byId = await db.collection('workers').where({ id: workerId }).limit(1).get();
    if (byId.data && byId.data.length > 0) return byId.data[0];
  } catch (e) {}
  return null;
}

function toDateSafe(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

async function getPlatformOpenids() {
  const res = await db.collection('users').where({ role: 'platform' }).get();
  return (res.data || []).map((item) => item.openid).filter((id) => !!id);
}

async function getWorkerOpenid(workerId) {
  if (!workerId) return '';
  const userRes = await db.collection('users').where({ role: 'worker', workerId }).limit(1).get();
  if (userRes.data && userRes.data.length > 0) return userRes.data[0].openid || '';
  return '';
}

async function sendSubscribeNotify(payload) {
  try {
    await cloud.callFunction({
      name: 'notify',
      data: {
        action: 'send',
        data: payload
      }
    });
  } catch (err) {
    console.warn('发送订阅通知失败:', err && (err.message || err.errMsg || err));
  }
}

function parseDurationDays(durationValue) {
  const text = String(durationValue || '').trim();
  if (!text) return 0;

  const monthMatch = text.match(/(\d+)\s*个?月/);
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    if (!Number.isNaN(months) && months > 0) return months * 30;
  }

  const dayMatch = text.match(/(\d+)\s*天/);
  if (dayMatch) {
    const days = parseInt(dayMatch[1], 10);
    if (!Number.isNaN(days) && days > 0) return days;
  }

  return 0;
}

function formatDateYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function calculateEndDate(startDate, durationValue) {
  const startText = String(startDate || '').trim();
  if (!startText) return '';
  const start = new Date(startText);
  if (Number.isNaN(start.getTime())) return '';

  const durationDays = parseDurationDays(durationValue);
  if (durationDays <= 0) return startText;

  const end = new Date(start.getTime());
  end.setDate(end.getDate() + durationDays - 1);
  return formatDateYmd(end);
}

function parseContractMonths(durationValue) {
  const text = String(durationValue || '').trim();
  const monthMatch = text.match(/(\d+)\s*个?月/);
  if (!monthMatch) return 0;
  const months = parseInt(monthMatch[1], 10);
  if (Number.isNaN(months) || months <= 0) return 0;
  return months;
}

function normalizeDiscountFactor(inputValue) {
  if (inputValue === undefined || inputValue === null || inputValue === '') return 1;
  const factor = Number(inputValue);
  if (!Number.isFinite(factor) || factor <= 0 || factor > 1) return 1;
  return Number(factor.toFixed(2));
}

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function toFen(value) {
  return Math.max(1, Math.round((Number(value) || 0) * 100));
}

function buildPaymentSummary(booking) {
  const contractMonths = parseContractMonths(booking.duration);
  const agencyFeeMonths = contractMonths >= 24 ? 2 : 1;
  const monthlySalary = roundMoney(booking.monthlySalary || 0);
  const discountFactor = normalizeDiscountFactor(booking.discountFactor);
  const agencyFeeBase = roundMoney(monthlySalary * agencyFeeMonths);
  const agencyFee = roundMoney(agencyFeeBase * discountFactor);
  const firstMonthSalary = roundMoney(monthlySalary);
  const payableTotal = roundMoney(agencyFee + firstMonthSalary);
  return {
    contractMonths,
    agencyFeeMonths,
    monthlySalary,
    discountFactor,
    agencyFeeBase,
    agencyFee,
    firstMonthSalary,
    payableTotal,
    showDiscount: discountFactor !== 1
  };
}

function genTradeNo(orderId) {
  const ts = Date.now();
  const suffix = String(orderId || '').replace(/[^a-zA-Z0-9]/g, '').slice(-10);
  return `NC${ts}${suffix}`.slice(0, 32);
}

function getPayParamsFromCloudResponse(result) {
  if (!result) return null;
  if (result.payment && result.payment.timeStamp) return result.payment;
  if (result.payment && result.payment.paySign) return result.payment;
  if (result.result && result.result.payment) return result.result.payment;
  if (result.timeStamp && result.nonceStr && result.package && result.paySign) {
    return {
      timeStamp: String(result.timeStamp),
      nonceStr: result.nonceStr,
      package: result.package,
      signType: result.signType || 'MD5',
      paySign: result.paySign
    };
  }
  return null;
}

async function syncOrderStatusByDate(openid) {
  const today = formatDateYmd(new Date());
  await db.collection('orders')
    .where({
      userOpenid: openid,
      status: _.in(['pending', 'confirmed']),
      startDate: _.neq('').and(_.lte(today))
    })
    .update({
      data: {
        status: 'in_service',
        updatedAt: db.serverDate()
      }
    });
}

async function getList(openid, data) {
  await syncOrderStatusByDate(openid);

  const status = data && data.status ? data.status : 'all';
  const page = data && data.page ? data.page : 1;
  const limit = data && data.limit ? data.limit : 10;

  const where = { userOpenid: openid };
  
  // 状态筛选：pending 表示待服务（包含 pending 和 confirmed）
  if (status !== 'all') {
    if (status === 'pending') {
      where.status = _.in(['pending_payment', 'pending', 'confirmed']);
    } else if (status === 'serving') {
      where.status = _.in(['serving', 'in_service']);
    } else if (status === 'in_service') {
      where.status = _.in(['serving', 'in_service']);
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
    
    const worker = await findWorkerById(order.workerId);
    if (worker) {
      workerName = maskName(worker.name);
      workerAvatar = worker.avatar;
    }
    
    list.push({
      _id: order._id,
      workerId: order.workerId,
      workerName: workerName,
      workerAvatar: workerAvatar,
      serviceType: order.serviceType,
      serviceSchedule: order.serviceSchedule || '',
      startDate: order.startDate,
      endDate: order.endDate,
      price: order.price,
      paymentStatus: order.paymentStatus || '',
      payableTotal: order.payableTotal || 0,
      discountFactor: normalizeDiscountFactor(order.discountFactor),
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
  await syncOrderStatusByDate(openid);

  const id = data.id;
  const orderRes = await db.collection('orders')
    .where({ _id: id, userOpenid: openid })
    .get();

  if (orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' };
  }

  const order = orderRes.data[0];
  const worker = await findWorkerById(order.workerId);

  return {
    success: true,
    data: {
      _id: order._id,
      workerId: order.workerId,
      workerName: worker ? worker.name : '未知阿姨',
      workerAvatar: worker ? worker.avatar : '/images/default-avatar.png',
      workerPhone: worker ? worker.phone : '',
      serviceType: order.serviceType,
      serviceSchedule: order.serviceSchedule || '',
      startDate: order.startDate,
      endDate: order.endDate,
      address: order.address,
      contactName: order.contactName,
      contactPhone: order.contactPhone,
      remark: order.remark,
      price: order.price,
      paymentStatus: order.paymentStatus || '',
      monthlySalary: roundMoney(order.monthlySalary || 0),
      agencyFeeMonths: order.agencyFeeMonths || 0,
      agencyFeeBase: roundMoney(order.agencyFeeBase || 0),
      agencyFee: roundMoney(order.agencyFee || 0),
      discountFactor: normalizeDiscountFactor(order.discountFactor),
      firstMonthSalary: roundMoney(order.firstMonthSalary || 0),
      payableTotal: roundMoney(order.payableTotal || 0),
      paidAmount: roundMoney(order.paidAmount || 0),
      showDiscount: normalizeDiscountFactor(order.discountFactor) !== 1,
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
    serviceSchedule: data.serviceSchedule || '',
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

async function createFromBooking(openid, data) {
  const bookingId = data && data.bookingId;
  const contractSigned = !!(data && data.contractSigned);
  if (!bookingId) return { success: false, message: '预约ID不能为空' };
  if (!contractSigned) return { success: false, message: '请先签署合同' };

  const bookingRes = await db.collection('bookings').where({ _id: bookingId }).limit(1).get();
  if (!bookingRes.data || bookingRes.data.length === 0) {
    return { success: false, message: '预约不存在' };
  }

  const booking = bookingRes.data[0];
  const ownerMatched = booking.employerOpenid === openid || booking.userOpenid === openid;
  if (!ownerMatched) {
    return { success: false, message: '无权限操作该预约' };
  }
  if (booking.status !== 'interview_passed' && booking.status !== 'order_created') {
    return { success: false, message: '当前预约状态不可提交订单' };
  }
  let salaryBase = Number(booking.monthlySalary) || 0;
  if (salaryBase <= 0 && booking.workerId) {
    const worker = await findWorkerById(booking.workerId);
    if (worker && worker.price && Number(worker.price.monthly) > 0) {
      salaryBase = Number(worker.price.monthly);
    }
  }
  const paymentSummary = buildPaymentSummary({
    ...booking,
    monthlySalary: salaryBase
  });
  if (paymentSummary.monthlySalary <= 0) {
    return { success: false, message: '月薪配置无效，无法创建支付订单' };
  }

  let orderId = booking.orderId || '';
  let orderDoc = null;

  if (orderId) {
    try {
      const orderRes = await db.collection('orders').doc(orderId).get();
      orderDoc = orderRes && orderRes.data ? orderRes.data : null;
    } catch (e) {
      orderDoc = null;
    }
  }

  if (!orderDoc) {
    const orderData = {
      bookingId,
      userOpenid: booking.employerOpenid || booking.userOpenid,
      workerId: booking.workerId,
      serviceType: booking.serviceType || '',
      serviceSchedule: booking.serviceSchedule || booking.serviceMode || '',
      startDate: booking.startDate || '',
      endDate: booking.endDate || calculateEndDate(booking.startDate, booking.duration),
      address: booking.address || '',
      contactName: booking.contactName || '',
      contactPhone: booking.contactPhone || '',
      remark: booking.remark || '',
      price: booking.totalPrice || 0,
      status: 'pending_payment',
      paymentStatus: 'unpaid',
      monthlySalary: paymentSummary.monthlySalary,
      agencyFeeMonths: paymentSummary.agencyFeeMonths,
      agencyFeeBase: paymentSummary.agencyFeeBase,
      discountFactor: paymentSummary.discountFactor,
      agencyFee: paymentSummary.agencyFee,
      firstMonthSalary: paymentSummary.firstMonthSalary,
      payableTotal: paymentSummary.payableTotal,
      paidAmount: 0,
      contractSigned: true,
      contractSignedAt: db.serverDate(),
      createdAt: db.serverDate(),
      updatedAt: db.serverDate()
    };

    const orderAddRes = await db.collection('orders').add({ data: orderData });
    orderId = orderAddRes._id;
    orderDoc = { _id: orderId, ...orderData };

    const statusHistory = Array.isArray(booking.statusHistory) ? booking.statusHistory.slice() : [];
    statusHistory.push({
      from: booking.status,
      to: 'order_created',
      operator: openid,
      operatorRole: 'employer',
      remark: '雇主提交订单并签署合同（待支付）',
      time: new Date()
    });

    await db.collection('bookings').doc(bookingId).update({
      data: {
        status: 'order_created',
        orderId: orderId,
        contractSigned: true,
        statusHistory,
        updatedAt: db.serverDate()
      }
    });

    const workerOpenid = await getWorkerOpenid(booking.workerId);
    if (workerOpenid) {
      await sendSubscribeNotify({
        toOpenids: [workerOpenid],
        page: '/packageB/pages/bookings/bookings',
        title: '雇主已签约，待支付',
        target: booking.workerName || '预约单',
        remark: '订单已创建，待雇主支付'
      });
    }

    const platformOpenids = await getPlatformOpenids();
    if (platformOpenids.length > 0) {
      await sendSubscribeNotify({
        toOpenids: platformOpenids,
        page: '/packageC/pages/interview-admin/interview-admin',
        title: '预约已转订单',
        target: booking.workerName || '预约单',
        remark: '已签约待支付'
      });
    }
  }

  return {
    success: true,
    data: {
      orderId,
      orderStatus: orderDoc.status || 'pending_payment',
      paymentStatus: orderDoc.paymentStatus || 'unpaid',
      paymentSummary
    },
    message: '订单创建成功，请完成支付'
  };
}

async function payOrder(openid, data) {
  const orderId = data && (data.orderId || data.id);
  if (!orderId) return { success: false, message: '订单ID不能为空' };

  const orderRes = await db.collection('orders').where({ _id: orderId, userOpenid: openid }).limit(1).get();
  if (!orderRes.data || orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' };
  }

  const order = orderRes.data[0];
  const paymentStatus = order.paymentStatus || '';
  if (paymentStatus === 'paid') {
    return {
      success: true,
      data: { orderId, paymentStatus: 'paid' },
      message: '订单已支付'
    };
  }

  let payableTotal = roundMoney(order.payableTotal || 0);
  let finalOrder = order;
  if (order.bookingId) {
    try {
      const bookingRes = await db.collection('bookings').where({ _id: order.bookingId }).limit(1).get();
      if (bookingRes.data && bookingRes.data.length > 0) {
        const booking = bookingRes.data[0];
        const paymentSummary = buildPaymentSummary({
          ...booking,
          monthlySalary: order.monthlySalary || booking.monthlySalary
        });
        payableTotal = paymentSummary.payableTotal;
        await db.collection('orders').doc(orderId).update({
          data: {
            agencyFeeMonths: paymentSummary.agencyFeeMonths,
            agencyFeeBase: paymentSummary.agencyFeeBase,
            discountFactor: paymentSummary.discountFactor,
            agencyFee: paymentSummary.agencyFee,
            firstMonthSalary: paymentSummary.firstMonthSalary,
            payableTotal: paymentSummary.payableTotal,
            updatedAt: db.serverDate()
          }
        });
        finalOrder = {
          ...order,
          agencyFeeMonths: paymentSummary.agencyFeeMonths,
          agencyFeeBase: paymentSummary.agencyFeeBase,
          discountFactor: paymentSummary.discountFactor,
          agencyFee: paymentSummary.agencyFee,
          firstMonthSalary: paymentSummary.firstMonthSalary,
          payableTotal: paymentSummary.payableTotal
        };
      }
    } catch (e) {}
  }

  if (payableTotal <= 0) {
    return { success: false, message: '应付金额异常' };
  }

  const outTradeNo = genTradeNo(orderId);
  let payResult = null;
  try {
    payResult = await cloud.cloudPay.unifiedOrder({
      body: `阿姨快约服务费-${String(orderId).slice(-6)}`,
      outTradeNo,
      spbillCreateIp: '127.0.0.1',
      totalFee: toFen(payableTotal),
      envId: process.env.TCB_ENV,
      functionName: 'order'
    });
  } catch (err) {
    return { success: false, message: `拉起微信支付失败：${err.message || err.errMsg || '请检查支付配置'}` };
  }

  const payParams = getPayParamsFromCloudResponse(payResult);
  if (!payParams) {
    return { success: false, message: '支付参数生成失败，请检查云支付配置' };
  }

  await db.collection('orders').doc(orderId).update({
    data: {
      outTradeNo,
      paymentStatus: 'unpaid',
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    data: {
      orderId,
      outTradeNo,
      paymentStatus: 'unpaid',
      payableTotal: finalOrder.payableTotal || payableTotal,
      payment: {
        timeStamp: String(payParams.timeStamp),
        nonceStr: payParams.nonceStr,
        package: payParams.package,
        signType: payParams.signType || 'MD5',
        paySign: payParams.paySign
      }
    },
    message: '支付参数生成成功'
  };
}

async function confirmPaid(openid, data) {
  const orderId = data && (data.orderId || data.id);
  if (!orderId) return { success: false, message: '订单ID不能为空' };

  const orderRes = await db.collection('orders').where({ _id: orderId, userOpenid: openid }).limit(1).get();
  if (!orderRes.data || orderRes.data.length === 0) {
    return { success: false, message: '订单不存在' };
  }
  const order = orderRes.data[0];

  if (order.paymentStatus === 'paid') {
    return { success: true, data: { orderId, status: order.status, paymentStatus: 'paid' }, message: '订单已支付' };
  }

  const startDate = String(order.startDate || '');
  const startAt = toDateSafe(startDate);
  if (!startAt) return { success: false, message: '订单开始日期无效' };
  const nextStatus = new Date() >= startAt ? 'in_service' : 'pending';

  await db.collection('orders').doc(orderId).update({
    data: {
      paymentStatus: 'paid',
      paidAmount: roundMoney(order.payableTotal || 0),
      paidAt: db.serverDate(),
      status: nextStatus,
      updatedAt: db.serverDate()
    }
  });

  return {
    success: true,
    data: { orderId, status: nextStatus, paymentStatus: 'paid' },
    message: '支付成功'
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
  if (order.status !== 'pending_payment' && order.status !== 'pending' && order.status !== 'confirmed') {
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
  if (order.status !== 'in_service' && order.status !== 'serving') {
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
  await syncOrderStatusByDate(openid);

  // 获取全部订单数量
  const allCount = await db.collection('orders')
    .where({ userOpenid: openid })
    .count();
  
  // 获取待服务订单数量（pending + confirmed）
  const pendingCount = await db.collection('orders')
    .where({
      userOpenid: openid,
      status: _.in(['pending_payment', 'pending', 'confirmed'])
    })
    .count();
  
  // 获取服务中订单数量
  const servingCount = await db.collection('orders')
    .where({
      userOpenid: openid,
      status: _.in(['serving', 'in_service'])
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
