const stats = document.getElementById('stats');

if (stats) {
  stats.innerHTML = `
    <ul>
      <li>Total Users: --</li>
      <li>Pending Redemptions: --</li>
      <li>Rewards Issued: --</li>
    </ul>
  `;
}
