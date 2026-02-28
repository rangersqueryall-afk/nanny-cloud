const USER_ROLE = {
  USER: 'user',
  WORKER: 'worker',
  PLATFORM: 'platform'
};

const SERVICE_TYPE_TEXT = {
  livein: '住家服务',
  daytime: '白班服务',
  temporary: '临时服务',
  babysitter: '保姆',
  nanny: '育儿嫂',
  maternity: '月嫂',
  elderly: '护老',
  hourly: '钟点工'
};

const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  SERVING: 'serving',
  IN_SERVICE: 'in_service',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

const ORDER_LIST_STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '待服务',
  [ORDER_STATUS.CONFIRMED]: '待服务',
  [ORDER_STATUS.SERVING]: '服务中',
  [ORDER_STATUS.IN_SERVICE]: '服务中',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消'
};

const ORDER_DETAIL_STATUS_TEXT = {
  [ORDER_STATUS.PENDING]: '待服务',
  [ORDER_STATUS.CONFIRMED]: '已确认',
  [ORDER_STATUS.SERVING]: '服务中',
  [ORDER_STATUS.IN_SERVICE]: '服务中',
  [ORDER_STATUS.COMPLETED]: '已完成',
  [ORDER_STATUS.CANCELLED]: '已取消'
};

const ORDER_PAGE_TABS = [
  { label: '全部', value: 'all' },
  { label: '待服务', value: 'pending' },
  { label: '服务中', value: 'serving' },
  { label: '已完成', value: 'completed' }
];

const PROFILE_ORDER_STATUS_TAB_INDEX = {
  all: 0,
  pending: 1,
  serving: 2,
  completed: 3
};

const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  INTERVIEW_SCHEDULED: 'interview_scheduled',
  INTERVIEW_PASSED: 'interview_passed',
  INTERVIEW_FAILED: 'interview_failed',
  ORDER_CREATED: 'order_created',
  CANCELLED_BY_EMPLOYER: 'cancelled_by_employer',
  TERMINATED: 'terminated',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed'
};

const BOOKING_STATUS_TEXT = {
  [BOOKING_STATUS.PENDING]: '待处理',
  [BOOKING_STATUS.ACCEPTED]: '阿姨已接受',
  [BOOKING_STATUS.REJECTED]: '已被拒绝',
  [BOOKING_STATUS.INTERVIEW_SCHEDULED]: '已安排面试',
  [BOOKING_STATUS.INTERVIEW_PASSED]: '面试通过',
  [BOOKING_STATUS.INTERVIEW_FAILED]: '面试未通过',
  [BOOKING_STATUS.ORDER_CREATED]: '已转订单',
  [BOOKING_STATUS.CANCELLED_BY_EMPLOYER]: '已取消',
  [BOOKING_STATUS.TERMINATED]: '已终止',
  [BOOKING_STATUS.CONFIRMED]: '已确认',
  [BOOKING_STATUS.CANCELLED]: '已取消',
  [BOOKING_STATUS.COMPLETED]: '已完成'
};

const INTERVIEW_ADMIN_TABS = [
  { label: '待安排', value: BOOKING_STATUS.ACCEPTED },
  { label: '待结果', value: BOOKING_STATUS.INTERVIEW_SCHEDULED },
  { label: '已完成', value: 'done' }
];

module.exports = {
  USER_ROLE,
  SERVICE_TYPE_TEXT,
  ORDER_STATUS,
  ORDER_LIST_STATUS_TEXT,
  ORDER_DETAIL_STATUS_TEXT,
  ORDER_PAGE_TABS,
  PROFILE_ORDER_STATUS_TAB_INDEX,
  BOOKING_STATUS,
  BOOKING_STATUS_TEXT,
  INTERVIEW_ADMIN_TABS
};
