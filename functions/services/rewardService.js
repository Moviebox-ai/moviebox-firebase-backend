const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { normalizeRewardIntent } = require('../utils/rewardIntent');
const { getBaseRiskScore, applyRiskDeltas, getRiskLevel } = require('../riskEngine');
const { getRewardRequestSignals } = require('../behaviorTracker');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

module.exports = {
  grantReward: functions.https.onCall(async (data, context) => {
    const MIN_DAILY_REWARD_LIMIT = 10;
    const MAX_DAILY_REWARD_LIMIT = 15;

    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    const uid = context.auth.uid;
    const deviceHash = typeof data?.deviceHash === 'string' ? data.deviceHash.trim() : '';
    const rewardIntent = normalizeRewardIntent(data?.rewardIntent);
    const db = admin.firestore();

    if (!rewardIntent) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Reward can only be granted after user voluntarily taps "Watch Ad to Support Us"'
      );
    }

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

    if (
      !Number.isFinite(dailyLimit)
      || !Number.isInteger(dailyLimit)
      || dailyLimit < MIN_DAILY_REWARD_LIMIT
      || dailyLimit > MAX_DAILY_REWARD_LIMIT
    ) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Invalid daily limit config. Must be an integer between ${MIN_DAILY_REWARD_LIMIT} and ${MAX_DAILY_REWARD_LIMIT}`
      );
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
      const now = Date.now();
      let riskScore = getBaseRiskScore(user.riskScore);

      let crowdedIp = false;
      let sharedDeviceHash = false;

      if (ip) {
        const ipSnapshot = await db.collection('users').where('lastIP', '==', ip).get();
        crowdedIp = ipSnapshot.size > 3;
      }

      if (deviceHash) {
        const similarDevices = await db
          .collection('behaviorLogs')
          .where('deviceHash', '==', deviceHash)
          .get();
        sharedDeviceHash = similarDevices.size > 3;
      }

      const behaviorSignals = getRewardRequestSignals({
        now,
        user,
        incomingDeviceHash: deviceHash,
        crowdedIp
      });

      riskScore = applyRiskDeltas({
        baseRiskScore: riskScore,
        ...behaviorSignals
      });

      if (sharedDeviceHash) {
        riskScore += 50;
      }

      const riskLevel = getRiskLevel(riskScore);

      if (riskLevel === 'banned') {
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

      if (riskLevel === 'high') {
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

      if (currentDailyAdCount >= dailyLimit) {
        throw new functions.https.HttpsError('failed-precondition', 'Daily limit reached');
      }

      transaction.update(userRef, {
        totalCoins: currentCoins + coinPerReward,
        dailyAdCount: currentDailyAdCount + 1,
        lastRewardMillis: now,
        lastRewardTime: admin.firestore.FieldValue.serverTimestamp(),
        lastRewardIntent: rewardIntent,
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
