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

    return db.runTransaction(async (transaction) => {
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

      if (currentDailyAdCount >= dailyLimit) {
        throw new functions.https.HttpsError('failed-precondition', 'Daily limit reached');
      }

      transaction.update(userRef, {
        totalCoins: currentCoins + coinPerReward,
        dailyAdCount: currentDailyAdCount + 1
      });

      return { success: true };
    });
  })
};
