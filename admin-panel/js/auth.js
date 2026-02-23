import {
  GoogleAuthProvider,
  getIdTokenResult,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase-config.js';
import { hasAdminAccess } from './admin-access.js';

const loginBtn = document.getElementById('login-btn');
const googleLoginBtn = document.getElementById('google-login-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error');

const googleProvider = new GoogleAuthProvider();

function getFriendlyAuthError(errorCode) {
  switch (errorCode) {
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/popup-closed-by-user':
      return 'Google login popup was closed. Please try again.';
    case 'auth/account-exists-with-different-credential':
      return 'This email is linked with another sign-in method.';
    case 'auth/unauthorized-domain':
      return 'Current domain is not authorized in Firebase Auth settings.';
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Invalid email or password.';
    default:
      return 'Login failed. Please try again.';
  }
}

async function finishAdminLogin(user) {
  const tokenResult = await getIdTokenResult(user, true);
  const isAdmin = await hasAdminAccess(user, tokenResult);

  if (!isAdmin) {
    await signOut(auth);
    throw new Error('not-admin');
  }

  window.location.href = './dashboard.html';
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
    if (googleLoginBtn) googleLoginBtn.disabled = true;
    errorMessage.textContent = '';

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await finishAdminLogin(credential.user);
    } catch (error) {
      errorMessage.textContent =
        error.message === 'not-admin'
          ? 'This account is not approved for admin panel access.'
          : getFriendlyAuthError(error.code);
      console.error('Admin login failed:', error);
    } finally {
      loginBtn.disabled = false;
      if (googleLoginBtn) googleLoginBtn.disabled = false;
    }
  });
}

if (googleLoginBtn && errorMessage) {
  googleLoginBtn.addEventListener('click', async () => {
    googleLoginBtn.disabled = true;
    if (loginBtn) loginBtn.disabled = true;
    errorMessage.textContent = '';

    try {
      const credential = await signInWithPopup(auth, googleProvider);
      await finishAdminLogin(credential.user);
    } catch (error) {
      errorMessage.textContent =
        error.message === 'not-admin'
          ? 'This Google account is not approved for admin panel access.'
          : getFriendlyAuthError(error.code);
      console.error('Google admin login failed:', error);
    } finally {
      googleLoginBtn.disabled = false;
      if (loginBtn) loginBtn.disabled = false;
    }
  });
}
