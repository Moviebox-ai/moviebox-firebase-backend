module.exports = {
  getUserById: async (userId) => {
    return {
      success: true,
      message: 'User fetched (placeholder)',
      data: { userId }
    };
  }
};
