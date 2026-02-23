import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { auth, db } from './firebase-config.js';

const totalUsersEl = document.getElementById('totalUsers');
const totalCoinsEl = document.getElementById('totalCoins');
const bannedUsersEl = document.getElementById('bannedUsers');
const userList = document.getElementById('userList');
const redeemList = document.getElementById('redeemList');
const abuseList = document.getElementById('abuseList');
const adminLogList = document.getElementById('adminLogList');

window.showSection = function showSection(sectionId) {
  document.querySelectorAll('.section').forEach((sec) => {
    sec.classList.add('hidden');
  });
  document.getElementById(sectionId).classList.remove('hidden');
};

async function loadOverviewStats() {
  if (!totalUsersEl || !totalCoinsEl || !bannedUsersEl) {
    return;
  }

  const snapshot = await getDocs(collection(db, 'users'));

  let totalUsers = 0;
  let totalCoins = 0;
  let bannedUsers = 0;

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();

    totalUsers += 1;
    totalCoins += Number(user.totalCoins ?? 0);
    if (user.banned) bannedUsers += 1;
  });

  totalUsersEl.textContent = `Total Users: ${totalUsers}`;
  totalCoinsEl.textContent = `Total Coins: ${totalCoins}`;
  bannedUsersEl.textContent = `Banned Users: ${bannedUsers}`;
}

void loadOverviewStats();

window.saveSettings = function saveSettings() {
  const minDailyLimit = 10;
  const maxDailyLimit = 15;
  const rewardsEnabled = document.getElementById('rewardsEnabled')?.checked ?? false;
  const maintenanceMode = document.getElementById('maintenanceMode')?.checked ?? false;
  const rawDailyLimit = Number(document.getElementById('dailyLimit')?.value ?? 0);
  const dailyLimit = Math.min(maxDailyLimit, Math.max(minDailyLimit, Math.trunc(rawDailyLimit)));
  const coinPerReward = Number(document.getElementById('coinPerReward')?.value ?? 0);

  if (rawDailyLimit !== dailyLimit) {
    console.warn(`Daily limit adjusted to supported range (${minDailyLimit}-${maxDailyLimit}).`);
  }

  console.log('Settings saved (local preview):', {
    rewardsEnabled,
    maintenanceMode,
    dailyLimit,
    coinPerReward,
  });
};

let lastVisible = null;

window.loadUsers = async function loadUsers() {
  if (!userList) {
    return;
  }

  const usersCollection = collection(db, 'users');
  const usersQuery = lastVisible
    ? query(usersCollection, orderBy('email'), startAfter(lastVisible), limit(10))
    : query(usersCollection, orderBy('email'), limit(10));

  const snapshot = await getDocs(usersQuery);

  if (!lastVisible) {
    userList.innerHTML = '';
  }

  if (snapshot.empty && !lastVisible) {
    userList.innerHTML = `
      <ul>
        <li>No users found.</li>
      </ul>
    `;
    return;
  }

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const userCard = document.createElement('div');

    userCard.innerHTML = `
      ${user.email ?? 'Unknown email'} |
      Coins: ${user.totalCoins ?? 0} |
      Risk: ${user.riskLevel ?? 'n/a'}
      <button data-user-id="${docSnap.id}">
        ${user.banned ? 'Unban' : 'Ban'}
      </button>
    `;

    userCard.querySelector('button')?.addEventListener('click', () => {
      window.banUser(docSnap.id, user.banned);
    });

    userList.appendChild(userCard);
  });

  lastVisible = snapshot.docs[snapshot.docs.length - 1] ?? lastVisible;
};

window.searchUser = async function searchUser() {
  if (!userList) {
    return;
  }

  const email = document.getElementById('searchEmail')?.value?.trim();

  if (!email) {
    userList.innerHTML = `
      <ul>
        <li>Enter an email address to search.</li>
      </ul>
    `;
    return;
  }

  const snapshot = await getDocs(query(collection(db, 'users'), where('email', '==', email)));

  userList.innerHTML = '';

  if (snapshot.empty) {
    userList.innerHTML = `
      <ul>
        <li>No results found for ${email}.</li>
      </ul>
    `;
    return;
  }

  snapshot.forEach((docSnap) => {
    const user = docSnap.data();
    const userCard = document.createElement('div');

    userCard.innerHTML = `
      ${user.email ?? 'Unknown email'} |
      Coins: ${user.totalCoins ?? 0} |
      Risk: ${user.riskLevel ?? 'n/a'}
    `;

    userList.appendChild(userCard);
  });
};

window.loadMoreUsers = function loadMoreUsers() {
  void window.loadUsers();
};

window.banUser = async function banUser(userId, currentlyBanned = false) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, { banned: !currentlyBanned });

  await addDoc(collection(db, 'adminLogs'), {
    adminUid: auth.currentUser?.uid ?? null,
    action: 'Ban Toggle',
    targetUser: userId,
    timestamp: serverTimestamp(),
  });

  lastVisible = null;
  void window.loadUsers();
  void loadOverviewStats();
};

window.loadRedeems = function loadRedeems() {
  if (!redeemList) {
    return;
  }

  redeemList.innerHTML = `
    <ul>
      <li>No redeems loaded yet.</li>
    </ul>
  `;
};

window.loadAbuseLogs = async function loadAbuseLogs() {
  if (!abuseList) {
    return;
  }

  const snapshot = await getDocs(collection(db, 'abuseLogs'));

  abuseList.innerHTML = '';

  if (snapshot.empty) {
    abuseList.innerHTML = `
      <ul>
        <li>No fraud logs found.</li>
      </ul>
    `;
    return;
  }

  snapshot.forEach((docSnap) => {
    const log = docSnap.data();
    const logCard = document.createElement('div');

    logCard.textContent = `UID: ${log.uid ?? 'unknown'} | Reason: ${log.reason ?? 'unspecified'}`;
    abuseList.appendChild(logCard);
  });
};

window.loadAdminLogs = function loadAdminLogs() {
  if (!adminLogList) {
    return;
  }

  adminLogList.innerHTML = `
    <ul>
      <li>No admin logs loaded yet.</li>
    </ul>
  `;
};

window.logout = function logout() {
  window.location.href = './index.html';
};
