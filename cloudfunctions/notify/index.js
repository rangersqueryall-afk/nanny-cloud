/**
 * 订阅消息通知云函数
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

function clip(text, maxLen) {
  const value = String(text || '');
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen - 1)}…`;
}

function formatNow() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${mm}`;
}

async function registerSubscriptions(openid, data) {
  const acceptedTemplateIds = Array.isArray(data && data.acceptedTemplateIds)
    ? data.acceptedTemplateIds.filter((id) => typeof id === 'string' && id.trim())
    : [];

  if (acceptedTemplateIds.length === 0) {
    return { success: true, data: { updated: false }, message: '无有效模板ID' };
  }

  await db.collection('users')
    .where({ openid })
    .update({
      data: {
        subscribedTemplateIds: acceptedTemplateIds,
        subscribedAt: db.serverDate(),
        updatedAt: db.serverDate()
      }
    });

  return { success: true, data: { updated: true, acceptedTemplateIds }, message: '订阅记录已保存' };
}

async function sendNotify(data) {
  const toOpenids = Array.isArray(data && data.toOpenids)
    ? data.toOpenids.filter((id) => typeof id === 'string' && id.trim())
    : [];
  if (toOpenids.length === 0) {
    return { success: true, data: { sent: 0, failed: 0, skipped: true }, message: '无接收者' };
  }

  const templateId = (data && data.templateId)
    || process.env.SUBSCRIBE_TEMPLATE_ID
    || '';
  if (!templateId) {
    return { success: true, data: { sent: 0, failed: 0, skipped: true }, message: '未配置订阅模板ID' };
  }

  const page = (data && data.page) || 'pages/index/index';
  const title = clip((data && data.title) || '服务状态更新', 20);
  const target = clip((data && data.target) || '预约信息', 20);
  const remark = clip((data && data.remark) || '请进入小程序查看详情', 20);
  const time = clip((data && data.time) || formatNow(), 20);

  const errors = [];
  let sent = 0;
  for (const openid of toOpenids) {
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId,
        page,
        data: {
          thing1: { value: title },
          thing2: { value: target },
          time3: { value: time },
          thing4: { value: remark }
        },
        miniprogramState: 'formal',
        lang: 'zh_CN'
      });
      sent += 1;
    } catch (err) {
      errors.push({
        openid,
        errCode: err && (err.errCode || err.errcode),
        message: err && (err.message || err.errMsg || 'send failed')
      });
    }
  }

  return {
    success: true,
    data: {
      sent,
      failed: errors.length,
      errors
    },
    message: `发送完成：成功${sent}，失败${errors.length}`
  };
}

exports.main = async (event, context) => {
  const { action, data } = event || {};
  const { OPENID } = cloud.getWXContext();

  try {
    if (action === 'registerSubscriptions') {
      return await registerSubscriptions(OPENID, data);
    }
    if (action === 'send') {
      return await sendNotify(data);
    }
    return { success: false, message: '未知操作' };
  } catch (error) {
    return { success: false, message: error.message || 'notify failed' };
  }
};
