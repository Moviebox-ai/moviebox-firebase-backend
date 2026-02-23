import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { db } from './firebase-config.js';

const ADMIN_USERS_COLLECTION = 'admins';

export async function hasAdminAccess(user, idTokenResult = null) {
  if (!user) return false;

  if (idTokenResult?.claims?.admin === true) {
    return true;
  }

  const adminDoc = await getDoc(doc(db, ADMIN_USERS_COLLECTION, user.uid));
  if (adminDoc.exists()) {
    return true;
  }

  if (user.email) {
    const adminByEmailSnapshot = await getDocs(
      query(collection(db, ADMIN_USERS_COLLECTION), where('email', '==', user.email.toLowerCase()), limit(1)),
    );

    if (!adminByEmailSnapshot.empty) {
      return true;
    }
  }

  return false;
}
