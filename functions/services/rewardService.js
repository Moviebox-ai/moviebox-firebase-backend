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
      const currentSuspiciousCount = Number(user.suspiciousCount) || 0;
      const lastRewardMillis = Number(user.lastRewardMillis) || 0;
      const now = Date.now();
      const minRewardIntervalMs = 20000;
      const suspiciousBanThreshold = 3;

      if (now - lastRewardMillis < minRewardIntervalMs) {
        const updatedSuspiciousCount = currentSuspiciousCount + 1;

        if (updatedSuspiciousCount >= suspiciousBanThreshold) {
          transaction.update(userRef, {
            banned: true,
            suspiciousCount: updatedSuspiciousCount
          });
          return {
            shouldThrow: true,
            code: 'permission-denied',
            message: 'Auto banned for abuse',
            shouldLogAbuse: true
          };
        }

        transaction.update(userRef, {
          suspiciousCount: updatedSuspiciousCount
        });
        return {
          shouldThrow: true,
          code: 'resource-exhausted',
          message: 'Too fast reward attempt'
        };
      }

      if (currentDailyAdCount >= dailyLimit) {
        throw new functions.https.HttpsError('failed-precondition', 'Daily limit reached');
      }

      transaction.update(userRef, {
        totalCoins: currentCoins + coinPerReward,
        dailyAdCount: currentDailyAdCount + 1,
        lastRewardMillis: now,
        lastRewardTime: admin.firestore.FieldValue.serverTimestamp(),
        suspiciousCount: 0
      });

      return { success: true };
    });

    if (transactionResult.shouldThrow) {
      if (transactionResult.shouldLogAbuse) {
        await db.collection('abuseLogs').add({
          uid,
          reason: 'Rapid reward abuse',
          timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      throw new functions.https.HttpsError(transactionResult.code, transactionResult.message);
    }

    return transactionResult;
  })
};
