const { USER_ROLE } = require('./constants');

const ROLE_VIEW_MODE = {
  USER: USER_ROLE.USER,
  PLATFORM: USER_ROLE.PLATFORM
};

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

function getEffectiveRole(rawRole, roleViewMode) {
  const normalizedRole = normalizeRole(rawRole);
  if (normalizedRole !== USER_ROLE.PLATFORM) return normalizedRole;
  if (roleViewMode === ROLE_VIEW_MODE.USER) return USER_ROLE.USER;
  return USER_ROLE.PLATFORM;
}

module.exports = {
  ROLE_VIEW_MODE,
  normalizeRole,
  getRoleFromUser,
  getEffectiveRole,
  getRoleFlagsByRole,
  getRoleFlagsByUser
};
