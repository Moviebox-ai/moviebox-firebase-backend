const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error');

const ADMIN_EMAIL = 'admin@moviebox.com';
const ADMIN_PASSWORD = 'moviebox123';

if (loginBtn && emailInput && passwordInput && errorMessage) {
  loginBtn.addEventListener('click', () => {
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      errorMessage.textContent = '';
      window.location.href = './dashboard.html';
      return;
    }

    errorMessage.textContent = 'Invalid email or password.';
  });
}
