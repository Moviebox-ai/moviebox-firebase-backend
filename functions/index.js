const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const rewardService = require('./services/rewardService');
const redeemService = require('./services/redeemService');
const userService = require('./services/userService');

exports.health = functions.https.onRequest((req, res) => {
  res.status(200).json({ status: 'ok', service: 'moviebox-functions' });
});

exports.dailyReset = functions.pubsub
  .schedule('0 0 * * *')
  .timeZone('Asia/Kolkata')
  .onRun(async () => {
    const db = admin.firestore();
    const usersSnap = await db.collection('users').get();
    const batch = db.batch();

    usersSnap.forEach((doc) => {
      batch.update(doc.ref, {
        dailyAdCount: 0,
        dailyCoins: 0
      });
    });

    await batch.commit();

    console.log('Daily reset completed');
    return null;
  });

exports.grantReward = rewardService.grantReward;
exports.processRedeem = redeemService.processRedeem;
exports.rewardService = rewardService;
exports.redeemService = redeemService;
exports.userService = userService;

exports.trackBehavior = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.');
  }

  const uid = context.auth.uid;
  const rewardClicks = data.rewardClicks;
  const sessionDuration = data.sessionDuration;

  await admin
    .firestore()
    .collection('riskProfile')
    .doc(uid)
    .set(
      {
        rewardClicks,
        sessionDuration,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

  return { success: true };
});

exports.calculateRisk = functions.firestore
  .document('riskProfile/{uid}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) {
      return null;
    }

    const data = change.after.data() || {};
    const uid = context.params.uid;

    let score = 0;

    if (Number(data.rewardClicks) > 20) {
      score += 30;
    }

    if (Number(data.sessionDuration) < 60000) {
      score += 30;
    }

    if (Number(data.sessionDuration) > 8 * 60 * 60 * 1000) {
      score += 20;
    }

    let level = 'LOW';
    if (score >= 70) {
      level = 'HIGH';
    } else if (score >= 40) {
      level = 'MEDIUM';
    }

    await admin
      .firestore()
      .collection('users')
      .doc(uid)
      .set(
        {
          riskScore: score,
          riskLevel: level,
          ...(score >= 80 && { banned: true })
        },
        { merge: true }
      );

    return null;
  });
