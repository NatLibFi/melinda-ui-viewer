//-----------------------------------------------------------------------------------------
// Initialize Viewer app
//-----------------------------------------------------------------------------------------


/* Local imports */
import {checkFile} from '/scripts/fileHandling.mjs';
import {doIndexedDbCheck} from '/scripts/indexedDB.mjs';
import {unselectDateButtons} from '/scripts/searchModal.mjs';

/* Shared imports */
import {disableElement} from '/shared/scripts/elements.js';
import {showSnackbar} from '/shared/scripts/snackbar.js';
import {eventHandled, ignore} from '/shared/scripts/uiUtils.js';

/* Local globals defined in Viewer app */
/* global
    doSearchPress
*/

const logTypes = ['MATCH_LOG', 'MERGE_LOG'];

window.initialize = function () {
  console.log('Initializing');

  const select = document.querySelector(`#viewer #sequence`);
  select.innerHTML = '';
  disableElement(select);
  parseUrlParameters();
  doIndexedDbCheck();
  addSearchModalEventListeners();
  addFileDialogEventListeners();

  function parseUrlParameters() {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const id = urlParams.get('id') || '';
    const logType = urlParams.get('logType') || 'MERGE_LOG';
    const sequence = urlParams.get('sequence') || '';

    if (id !== '') {
      document.querySelector(`#viewer #id`).defaultValue = id;
    }

    document.querySelector(`#viewer #sequenceInput`).value = sequence;
    document.querySelector(`#viewer #logType`).value = logType;

    if (id !== '' && !logTypes.some((x) => logType === x)) {
      showSnackbar({style: 'alert', text: 'Linkin lokia ei voi hakea. Lokityyppi ei ole kelvollinen.'});
      return;
    }

    window.history.pushState('', 'viewer', '/');

    if (id !== '') {
      doSearchPress();
      showSnackbar({style: 'info', text: 'Haetaan linkin lokia...'});
    }
  }

  // event listeners for some elements for the correlation id list modal
  function addSearchModalEventListeners() {
    const modal = document.querySelector(`#correlationIdListModal`);
    const modalContent = document.querySelector(`#correlationIdListModal #correlationIdListModalContent`);
    const dateStartInput = document.querySelector(`#correlationIdListModal #dateStartInput`);
    const dateEndInput = document.querySelector(`#correlationIdListModal #dateEndInput`);
    const scrollToTopButton = document.querySelector(`#correlationIdListModal #scrollToTopButton`);

    dateStartInput.addEventListener('click', event => {
      event.stopPropagation();
      unselectDateButtons();
    });

    dateEndInput.addEventListener('click', event => {
      event.stopPropagation();
      unselectDateButtons();
    });

    modal.addEventListener('scroll', event => {
      eventHandled(event);
      scrollToTopButton.style.display = modal.scrollTop > 100 ? 'block' : 'none';
    });

    modalContent.addEventListener('click', event => {
      ignore(event);
    });
  }

  // event listeners for some elements in the dialog for file upload
  function addFileDialogEventListeners() {
    const fileInput = document.getElementById('fileUpload');
    const fileNameDiv = document.getElementById('selectedFileName');
    const clearFileSelectButton = document.getElementById('clearFileSelect');

    fileInput.addEventListener('change', event => {
      eventHandled(event);

      const file = fileInput.files[0];
      checkFile(file);

      file
        ? (fileNameDiv.innerHTML = file.name, fileNameDiv.classList.add('file-selected'), clearFileSelectButton.style.display = 'flex')
        : (fileNameDiv.innerHTML = 'Ei valittua tiedostoa', fileNameDiv.classList.remove('file-selected'), clearFileSelectButton.style.display = 'none');

    });

  }

};
