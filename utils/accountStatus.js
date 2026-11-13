const inactiveAccount = {
  code: 'ACCOUNT_INACTIVE',
  title: 'Account Inactive',
  message: 'Your account is currently inactive. Please contact the administrator to activate your account.'
};
const blockedAccount = {
  code: 'ACCOUNT_BLOCKED',
  title: 'Account Blocked',
  message: 'You have been blocked from accessing your account. Please contact the administrator for assistance.'
};
module.exports = { inactiveAccount, blockedAccount };
