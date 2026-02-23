module.exports = function adminCheck(user) {
  return Boolean(user && user.isAdmin);
};
