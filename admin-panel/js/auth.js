const loginBtn = document.getElementById('login-btn');

if (loginBtn) {
  loginBtn.addEventListener('click', () => {
    console.log('Login flow placeholder');
    window.location.href = './dashboard.html';
  });
}
