const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

module.exports = {
  grantReward: functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    const uid = context.auth.uid;
    const deviceHash = typeof data?.deviceHash === 'string' ? data.deviceHash.trim() : '';
    const db = admin.firestore();

    const userRef = db.collection('users').doc(uid);
    const configRef = db.collection('config').doc('appSettings');

    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      throw new functions.https.HttpsError('failed-precondition', 'App settings missing');
    }

    const config = configSnap.data();
    const coinPerReward = Number(config.coinPerReward);
    const dailyLimit = Number(config.dailyLimit);

    if (!Number.isFinite(coinPerReward) || coinPerReward <= 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid coin reward config');
    }

    if (!Number.isFinite(dailyLimit) || dailyLimit < 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Invalid daily limit config');
    }

    if (!config.rewardsEnabled) {
      throw new functions.https.HttpsError('failed-precondition', 'Rewards disabled');
    }

    const clientReportedIp = typeof data?.lastIP === 'string' ? data.lastIP.trim() : '';
    const forwardedFor = context.rawRequest?.headers?.['x-forwarded-for'];
    const ipFromForwardedFor = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : (forwardedFor || '').split(',')[0];
    const ip = (ipFromForwardedFor || context.rawRequest?.connection?.remoteAddress || clientReportedIp || '').trim();

    const transactionResult = await db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User record not found');
      }

      const user = userSnap.data();

      if (user.banned) {
        throw new functions.https.HttpsError('permission-denied', 'User banned');
      }

      const currentCoins = Number(user.totalCoins) || 0;
      const currentDailyAdCount = Number(user.dailyAdCount) || 0;
      let riskScore = Math.max(0, (Number(user.riskScore) || 0) - 10);

      const lastRewardMillis = Number(user.lastRewardMillis) || 0;
      const now = Date.now();
      const minRewardIntervalMs = 20000;
      const timeDiff = now - lastRewardMillis;

      if (timeDiff < minRewardIntervalMs) {
        riskScore += 20;
      }

      if (user.deviceHash && deviceHash && user.deviceHash !== deviceHash) {
        riskScore += 40;
      }

      if (ip) {
        const ipSnapshot = await db.collection('users').where('lastIP', '==', ip).get();

        if (ipSnapshot.size > 3) {
          riskScore += 30;
        }
      }

      let riskLevel = 'safe';

      if (riskScore >= 100) {
        transaction.update(userRef, {
          banned: true,
          riskScore,
          riskLevel: 'banned'
        });
        return {
          shouldThrow: true,
          code: 'permission-denied',
          message: 'Auto banned',
          shouldLogAbuse: true,
          abuseReason: 'Risk score reached ban threshold',
          riskScore,
          riskLevel: 'banned'
        };
      }

      if (riskScore >= 60) {
        transaction.update(userRef, {
          riskScore,
          riskLevel: 'high'
        });
        return {
          shouldThrow: true,
          code: 'resource-exhausted',
          message: 'Reward temporarily disabled',
          shouldLogAbuse: true,
          abuseReason: 'High risk reward request blocked',
          riskScore,
          riskLevel: 'high'
        };
      }

      if (riskScore >= 30) {
        riskLevel = 'suspicious';
      }

      if (currentDailyAdCount >= dailyLimit) {
        throw new functions.https.HttpsError('failed-precondition', 'Daily limit reached');
      }

      transaction.update(userRef, {
        totalCoins: currentCoins + coinPerReward,
        dailyAdCount: currentDailyAdCount + 1,
        lastRewardMillis: now,
        lastRewardTime: admin.firestore.FieldValue.serverTimestamp(),
        riskScore,
        riskLevel,
        ...(ip && { lastIP: ip }),
        ...(deviceHash && { deviceHash })
      });

      return { success: true, riskLevel };
    });

    if (transactionResult.shouldThrow) {
      if (transactionResult.shouldLogAbuse) {
        await db.collection('abuseLogs').add({
          uid,
          reason: transactionResult.abuseReason || 'Rapid reward abuse',
          ...(transactionResult.riskLevel && { riskLevel: transactionResult.riskLevel }),
          ...(Number.isFinite(transactionResult.riskScore) && { riskScore: transactionResult.riskScore }),
          ...(ip && { ip }),
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      throw new functions.https.HttpsError(transactionResult.code, transactionResult.message);
    }

    return transactionResult;
  })
};
