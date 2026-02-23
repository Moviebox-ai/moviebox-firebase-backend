const admin = require('firebase-admin');
const functions = require('firebase-functions');

const rewardService = require('./services/rewardService');
const redeemService = require('./services/redeemService');
const userService = require('./services/userService');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.health = functions.https.onRequest((req, res) => {
  res.status(200).json({ status: 'ok', service: 'moviebox-functions' });
});

exports.processRedeem = redeemService.processRedeem;
exports.rewardService = rewardService;
exports.userService = userService;
