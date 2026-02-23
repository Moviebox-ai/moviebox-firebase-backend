const functions = require('firebase-functions');

const rewardService = require('./services/rewardService');
const redeemService = require('./services/redeemService');
const userService = require('./services/userService');

exports.health = functions.https.onRequest((req, res) => {
  res.status(200).json({ status: 'ok', service: 'moviebox-functions' });
});

exports.grantReward = rewardService.grantReward;
exports.rewardService = rewardService;
exports.redeemService = redeemService;
exports.userService = userService;
