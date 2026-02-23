const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (admin.apps.length === 0) {
  admin.initializeApp();
}

module.exports = {
  processRedeem: functions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }

    const amount = Number(data?.amount);

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new functions.https.HttpsError('invalid-argument', 'Valid redeem amount required');
    }

    const uid = context.auth.uid;
    const db = admin.firestore();
    const userRef = db.collection('users').doc(uid);

    return db.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);

      if (!userSnap.exists) {
        throw new functions.https.HttpsError('not-found', 'User record not found');
      }

      const user = userSnap.data();
      const currentCoins = Number(user.totalCoins) || 0;

      if (currentCoins < amount) {
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient coins');
      }

      transaction.update(userRef, {
        totalCoins: currentCoins - amount
      });

      transaction.set(db.collection('redeemRequests').doc(), {
        uid,
        email: user.email || null,
        amount,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return { success: true };
    });
  })
};
