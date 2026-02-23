import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase-config.js';

const loginBtn = document.getElementById('login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error');

function getFriendlyAuthError(errorCode) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    default:
      return 'Login failed. Please try again.';
  }
}

if (loginBtn && emailInput && passwordInput && errorMessage) {
  loginBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;

    if (!email || !password) {
      errorMessage.textContent = 'Please enter email and password.';
      return;
    }

    loginBtn.disabled = true;
    errorMessage.textContent = '';

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = './dashboard.html';
    } catch (error) {
      errorMessage.textContent = getFriendlyAuthError(error.code);
      console.error('Admin login failed:', error);
    } finally {
      loginBtn.disabled = false;
    }
  });
}
