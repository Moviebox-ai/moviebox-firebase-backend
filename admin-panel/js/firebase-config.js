import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyBSrS2P7CujpFXZAFJwjiamDk6I4u2ug74',
  authDomain: 'moviebox-cd231.firebaseapp.com',
  projectId: 'moviebox-cd231',
  storageBucket: 'moviebox-cd231.firebasestorage.app',
  messagingSenderId: '403581717691',
  appId: '1:403581717691:web:52a4c17a2f84d7fa356d9e',
  measurementId: 'G-ET9EF18FQ3',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const analyticsPromise = isSupported().then((supported) => {
  if (!supported) {
    return null;
  }

  return getAnalytics(app);
});
