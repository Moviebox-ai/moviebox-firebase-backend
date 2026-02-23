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

exports.logBehaviorEvent = functions.https.onCall(async (data, context) => {
  if (!context.auth || !context.auth.uid) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication is required.');
  }

  const uid = context.auth.uid;
  const rewardClicks = data.rewardClicks;
  const sessionDuration = data.sessionDuration;
  const deviceHash = data.deviceHash;

  await admin
    .firestore()
    .collection('behaviorLogs')
    .add({
      uid,
      rewardClicks,
      sessionDuration,
      deviceHash,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

  return { success: true };
});

exports.aiRiskEngine = functions.firestore
  .document('behaviorLogs/{logId}')
  .onCreate(async (snap) => {
    const data = snap.data() || {};
    const uid = data.uid;

    if (!uid) {
      return null;
    }

    const logsRef = admin.firestore().collection('behaviorLogs').where('uid', '==', uid);
    const logs = await logsRef.get();

    let totalClicks = 0;
    let totalDuration = 0;
    let count = 0;

    logs.forEach((doc) => {
      totalClicks += Number(doc.data().rewardClicks) || 0;
      totalDuration += Number(doc.data().sessionDuration) || 0;
      count += 1;
    });

    const avgClicks = count > 0 ? totalClicks / count : 0;

    let riskScore = 0;

    if (Number(data.rewardClicks) > avgClicks * 2) {
      riskScore += 40;
    }

    if (Number(data.sessionDuration) < 60000) {
      riskScore += 30;
    }

    if (Number(data.sessionDuration) > 8 * 60 * 60 * 1000) {
      riskScore += 20;
    }

    const userRef = admin.firestore().collection('users').doc(uid);

    await userRef.set(
      {
        riskScore,
        riskUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      },
      { merge: true }
    );

    if (riskScore >= 80) {
      await userRef.set({ banned: true }, { merge: true });
    }

    return null;
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
