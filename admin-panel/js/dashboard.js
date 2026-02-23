const stats = document.getElementById('stats');
const userList = document.getElementById('userList');
const redeemList = document.getElementById('redeemList');

if (stats) {
  stats.innerHTML = `
    <ul>
      <li>Total Users: --</li>
      <li>Pending Redemptions: --</li>
      <li>Rewards Issued: --</li>
    </ul>
  `;
}

window.saveSettings = function saveSettings() {
  const rewardsEnabled = document.getElementById('rewardsEnabled')?.checked ?? false;
  const maintenanceMode = document.getElementById('maintenanceMode')?.checked ?? false;
  const dailyLimit = Number(document.getElementById('dailyLimit')?.value ?? 0);
  const coinPerReward = Number(document.getElementById('coinPerReward')?.value ?? 0);

  console.log('Settings saved (local preview):', {
    rewardsEnabled,
    maintenanceMode,
    dailyLimit,
    coinPerReward,
  });
};

window.loadUsers = function loadUsers() {
  if (!userList) {
    return;
  }

  userList.innerHTML = `
    <ul>
      <li>No users loaded yet.</li>
    </ul>
  `;
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

window.logout = function logout() {
  window.location.href = './index.html';
};
