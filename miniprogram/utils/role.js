const { USER_ROLE } = require('./constants');

function normalizeRole(role) {
  if (role === USER_ROLE.WORKER) return USER_ROLE.WORKER;
  if (role === USER_ROLE.PLATFORM) return USER_ROLE.PLATFORM;
  return USER_ROLE.USER;
}

function getRoleFromUser(userInfo) {
  if (!userInfo || typeof userInfo !== 'object') return USER_ROLE.USER;
  return normalizeRole(userInfo.role);
}

function getRoleFlagsByRole(role) {
  const normalizedRole = normalizeRole(role);
  return {
    role: normalizedRole,
    isUser: normalizedRole === USER_ROLE.USER,
    isEmployer: normalizedRole === USER_ROLE.USER,
    isWorker: normalizedRole === USER_ROLE.WORKER,
    isPlatform: normalizedRole === USER_ROLE.PLATFORM
  };
}

function getRoleFlagsByUser(userInfo) {
  return getRoleFlagsByRole(getRoleFromUser(userInfo));
}

module.exports = {
  normalizeRole,
  getRoleFromUser,
  getRoleFlagsByRole,
  getRoleFlagsByUser
};
