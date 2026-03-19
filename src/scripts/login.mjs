import {authGetBaseToken, authLogin} from '/scripts/callRest.mjs';
import {hidePassword} from '/shared/scripts/form.js';
import {startProcess, stopProcess} from '/shared/scripts/progressbar.js';
import {eventHandled} from '/shared/scripts/uiUtils.js';
import {showSnackbar} from '/shared/scripts/snackbar.js';

window.initialize = function () {
  console.log('Initializing viewer login');
  addSubmitLoginFormEventListener();
};

function addSubmitLoginFormEventListener() {
  const loginForm = document.getElementById('loginForm');
  loginForm.addEventListener('submit', loginEvent);
}

async function loginEvent(event) {
  console.log('Login submit event');
  eventHandled(event);

  const passwordFormField = document.getElementById('passwordFormField');
  hidePassword(passwordFormField);

  const cookiesAndPrivacyNoticeConsent = document.getElementById('acceptTerms').checked;
  if (!cookiesAndPrivacyNoticeConsent) {
    console.log('User has to accept the terms (cookies and privacy notice) before logging into Melinda application');
    showSnackbar({style: 'info', text: 'Tietosuojaselosteen ja evästeiden käytön hyväksyminen vaaditaan'});
    return;
  }

  startProcess();

  const loginForm = document.getElementById('loginForm');
  const loginFormData = new FormData(loginForm);
  try {
    const {token} = await authGetBaseToken({
      username: loginFormData.get('loginUsername'),
      password: loginFormData.get('loginPassword')
    });
    await authLogin(token);
    location.reload();
  } catch (error) {
    console.log(error);
    showSnackbar({style: 'error', text: 'Käyttäjätunnus tai salasana on väärin'});
  } finally {
    stopProcess();
  }
}
