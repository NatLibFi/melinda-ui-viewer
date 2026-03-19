//-----------------------------------------------------------------------------------------
// Functions for log and record actions: copy link to record, protect record and remove log
//-----------------------------------------------------------------------------------------


/* Local imports */
import {protectLog, removeLog} from '/scripts/callRest.mjs';

/* Shared imports */
import {disableElement} from '/shared/scripts/elements.js';
import {startProcess, stopProcess} from '/shared/scripts/progressbar.js';
import {showSnackbar} from '/shared/scripts/snackbar.js';
import {eventHandled} from '/shared/scripts/uiUtils.js';

/* Local globals defined in Viewer app */
/* global
    clearLogView, doSearchPress
*/


window.copyLink = function (event) {
  eventHandled(event);

  const logType = document.querySelector(`#viewer #logType`).value || '';
  const id = document.querySelector(`#viewer #id`).value || '';
  const sequence = document.querySelector(`#viewer #sequence`).value || '';

  let link = window.location;

  if (id !== '' && sequence !== '') {
    link = `${window.location}?id=${id}&logType=${logType}&sequence=${sequence}`;
  }

  const button = createTestLinkButton(link);

  showSnackbar({style: 'success', text: `Linkki kopioitu!`, linkButton: button});
  navigator.clipboard.writeText(link);

  function createTestLinkButton(link) {
    const testLinkButton = document.createElement('button');
    testLinkButton.innerHTML = 'Testaa linkkiä';
    testLinkButton.title = link;
    testLinkButton.addEventListener('click', () => {
      window.open(link);
    });
    return testLinkButton;
  }
};

window.protect = function (event = undefined) {
  eventHandled(event);
  console.log('Protecting...');
  startProcess();

  const id = document.querySelector(`#viewer #id`).value || '';
  const sequence = document.querySelector(`#viewer #sequence`).value || 1;

  if (id === '') {
    showSnackbar({style: 'alert', text: 'ID:tä ei turvattu, koska ID-kenttä on tyhjä. Hae ID vielä uudelleen ennen turvaamista!'});
    console.log('Nothing to protect...');
    stopProcess();
    return;
  }

  protectLog(id, sequence)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Response status ok:false');
      }
      doSearchPress();
      showSnackbar({style: 'success', text: `Sekvenssin ${sequence} turvausta on muutettu. Päivitetään ID <span class="correlation-id-font">${id}</span>`});
    })
    .catch(error => {
      showSnackbar({style: 'error', text: 'Valitettavasti tämän ID:n ja sekvenssin turvausta ei pystytty muuttamaan!'});
      console.log(`Error while trying to protect log with correlation id ${id} and sequence ${sequence} `, error);
    })
    .finally(() => stopProcess());
};

export function setProtectButton(type) {
  const protectButton = document.querySelector(`#viewer #protect`);

  if (type === 'protected') {
    protectButton.innerHTML = 'lock';
    protectButton.title = 'Poista turvaus tästä sekvenssistä';
    protectButton.setAttribute('tooltip-text', 'Poista turvaus');
    protectButton.classList.add('inverse');
    return;
  }

  if (type === 'not protected') {
    protectButton.innerHTML = 'lock_open';
    protectButton.title = 'Turvaa tämä sekvenssi';
    protectButton.setAttribute('tooltip-text', 'Turvaa');
    protectButton.classList.remove('inverse');
    return;
  }

  disableElement(protectButton);
}

window.openRemoveDialog = function (event = undefined) {
  eventHandled(event);
  const id = document.querySelector(`#viewer #id`).value || '';
  const dialog = document.getElementById('dialogForRemove');
  const dialogIdText = document.getElementById('idToBeRemoved');

  if (id === '') {
    showSnackbar({status: 'alert', text: 'ID:tä ei poistettu, koska ID-kenttä on tyhjä. Hae ID vielä uudelleen ennen poistamista!'});
    console.log('Nothing to remove...');
    stopProcess();
    return;
  }

  dialogIdText.innerHTML = ` ${id} `;
  dialog.showModal();
};

window.cancelRemove = function (event = undefined) {
  console.log('Nothing removed');
  showSnackbar({status: 'info', text: 'Toiminto peruttu!'});
};

window.confirmRemove = function (event = undefined) {
  console.log('Removing...');
  startProcess();

  const id = document.querySelector(`#viewer #id`).value || '';

  remove(id);
};

function remove(id) {
  const force = '1';

  removeLog(id, force)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Response status ok:false');
      }
      clearLogView();
      showSnackbar({status: 'success', text: `Poistettiin ID <span class="correlation-id-font">${id}</span>`});
      console.log(`Log ${id} removed`);
    })
    .catch(error => {
      showSnackbar({status: 'error', text: 'Valitettavasti tätä ID:tä ei pystytty poistamaan!'});
      console.log(`Error while trying to remove log with correlation id ${id}: `, error);
    })
    .finally(() => stopProcess());
}
