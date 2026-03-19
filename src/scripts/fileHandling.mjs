//-----------------------------------------------------------------------------------------
// Functions for file dialog: file upload and file download for merge records
//-----------------------------------------------------------------------------------------


/* Local imports */
import {idbGetLogs} from '/scripts/indexedDB.mjs';
import {setDataToIndexedDB} from '/scripts/searchLog.mjs';

/* Shared imports */
import {disableElement, enableElement, getAllDescendants, highlightElement} from '/shared/scripts/elements.js';
import {showSnackbar} from '/shared/scripts/snackbar.js';
import {eventHandled} from '/shared/scripts/uiUtils.js';

/* Local globals defined in Viewer app */
/* global
    clearLogView
*/


window.downloadFile = function (event) {
  console.log('Downloading file...');
  eventHandled(event);

  const correlationId = document.querySelector(`#viewer #id`).value;
  const sequence = document.querySelector(`#viewer #sequence`).value;
  const logType = document.querySelector(`#viewer #logType`).value;
  const recordObject = new Object();

  idbGetLogs(sequence)
    .then((data) => {

      if (data.logItemType !== 'MERGE_LOG' && data.logItemType !== 'MATCH_LOG') {
        throw new Error('Wrong log item type (should be MERGE_LOG or MATCH_LOG)');
      }

      if (correlationId !== data.correlationId || sequence !== data.blobSequence.toString() || logType !== data.logItemType) {
        throw new Error('Id, sequence or log type do not match in UI and data');
      }

      setCorrelationId(data.correlationId);
      setBlobSequence(data.blobSequence.toString());
      setLogItemType(data.logItemType);
      setCreationTime(data.creationTime);
      setModificationTime(data.modificationTime);
      setCataloger(data.cataloger);
      setSourceIds(data.sourceIds);
      setTitle(data.title);
      setStandardIdentifiers(data.standardIdentifiers);
      setProtectedStatus(data.protected);
      setIncomingRecord(data.incomingRecord);

      if (data.logItemType === 'MERGE_LOG') {
        setPreferred(data.preference);
        setMelindaRecord(data.databaseRecord);
        setMergedRecord(data.mergedRecord);
      }

      if (data.logItemType === 'MATCH_LOG') {
        setMatchResults(data.matchResult);
        setMatcherReports(data.matcherReports);
      }

      doDownload(JSON.stringify(recordObject));
      showSnackbar({style: 'success', text: 'Tiedosto ladattiin onnistuneesti laitteellesi!'});
    })
    .catch((error) => {
      console.log('Problem getting or setting log data while creating record object: ', error);
      showSnackbar({style: 'error', text: 'Tiedostoa ei valitettavasti pystytty lataamaan'});
    });

  function setCorrelationId(id) {
    recordObject.correlationId = id;
  }

  function setBlobSequence(sequence) {
    recordObject.blobSequence = sequence;
  }

  function setLogItemType(logType) {
    recordObject.logItemType = logType;
  }

  function setCreationTime(time) {
    recordObject.creationTime = time;
  }

  function setModificationTime(time) {
    recordObject.modificationTime = time;
  }

  function setTitle(title) {
    recordObject.title = title;
  }

  function setSourceIds(sourceIds) {
    recordObject.sourceIds = sourceIds;
  }

  function setCataloger(cataloger) {
    recordObject.cataloger = cataloger;
  }

  function setStandardIdentifiers(standardIdentifiers) {
    recordObject.standardIdentifiers = standardIdentifiers;
  }

  function setProtectedStatus(protectedStatus) {
    recordObject.protected = protectedStatus;
  }

  function setPreferred(preference) {
    if (preference.recordName === 'databaseRecord') {
      recordObject.preferred = 'melindaRecord';
      return;
    }

    recordObject.preferred = preference.recordName;
  }

  function setIncomingRecord(record) {
    recordObject.incomingRecord = record;
  }

  function setMelindaRecord(record) {
    recordObject.melindaRecord = record;
  }

  function setMergedRecord(record) {
    recordObject.mergedRecord = record;
  }

  function setMatchResults(results) {
    if (results === undefined) {
      recordObject.matchResult = 'No match results';
      return;
    }

    recordObject.matchResult = results;
  }

  function setMatcherReports(reports) {
    if (reports === undefined) {
      recordObject.matcherReports = 'No matcher reports';
      return;
    }

    recordObject.matcherReports = reports;
  }

  function doDownload(fileContent) {
    const fileName = `${correlationId}_${sequence}_${logType}.json`;

    const linkElement = document.createElement('a');
    linkElement.download = fileName;
    linkElement.href = `data:attachment/text,${encodeURI(fileContent)}`;
    linkElement.click();
  }
};

window.uploadFile = function (event) {
  const dialog = document.getElementById('dialogForUpload');
  dialog.showModal();
};

window.showInstructions = function (event) {
  eventHandled(event);
  const instructions = document.getElementById('instructions');
  const hideButton = document.getElementById('hideInstructionsButton');
  const showButton = document.getElementById('showInstructionsButton');

  instructions.style.display = 'block';
  showButton.style.display = 'none';
  hideButton.style.display = 'flex';
};

window.hideInstructions = function (event) {
  eventHandled(event);
  const instructions = document.getElementById('instructions');
  const hideButton = document.getElementById('hideInstructionsButton');
  const showButton = document.getElementById('showInstructionsButton');

  instructions.style.display = 'none';
  showButton.style.display = 'flex';
  hideButton.style.display = 'none';
};

window.openFileBrowse = function (event) {
  eventHandled(event);
  const fileInput = document.getElementById('fileUpload');
  fileInput.click();
};

window.clearSelectedFile = function (event) {
  eventHandled(event);
  const fileInput = document.getElementById('fileUpload');
  fileInput.value = '';
  return fileInput.dispatchEvent(new Event('change'));
};

window.cancelUpload = function (event) {
  console.log('File upload cancelled');
  showSnackbar({style: 'status', text: 'Tiedoston avaaminen peruttu'});
};

window.confirmUpload = function (event) {
  const file = document.getElementById('fileUpload').files[0];
  const reader = new FileReader();

  clearLogView();

  if (file) {
    console.log(`Trying to read file ${file.name}...`);
    reader.readAsText(file, 'UTF-8');

    reader.onload = function (event) {
      const fileContent = event.target.result;
      const json = parseJson(fileContent);
      const log = parseLog(json);

      if (log) {
        console.log('Log parsed from file: ', log);
        selectLogType(log.logItemType);
        setDataToIndexedDB({0: log}, 0);
        showReaderMode();
        showSnackbar({style: 'info', text: 'Jos tietueissa on puutteita, tarkista aina myös lataamasi tiedoston laatu.'});
      }
    };

    reader.onerror = function (error) {
      console.log('Error reading file ', error);
      showSnackbar({style: 'error', text: 'Valitettavasti tiedoston avaus ei onnistunut!'});
    };

    function parseJson(text) {
      let data = null;

      if (text) {
        try {
          data = JSON.parse(text);
        } catch (error) {
          console.log('Error while parsing file content to JSON: ', error);
          showSnackbar({style: 'error', text: 'Tietueita ei voitu avata lukunäkymään, tarkista tiedosto'});
        }
      }

      return data;
    }

    function parseLog(data) {
      if (data === null) {
        console.log('No json data for parsing log');
        showSnackbar({style: 'error', text: 'Tietueita ei voitu avata lukunäkymään, tarkista tiedosto'});
        return;
      }

      if (data.melindaRecord === undefined && data.databaseRecord === undefined && data.mergedRecord === undefined && data.incomingRecord === undefined) {
        console.log('Records are undefined, invalid json data for parsing log');
        showSnackbar({style: 'error', text: 'Tietueita ei voitu avata lukunäkymään, tarkista tiedosto'});
        return;
      }

      const log = {...data};
      log.blobSequence = data.blobSequence || '0';
      log.creationTime = data.creationTime || 'Ei saatavilla';

      if (data.logItemType === 'MERGE_LOG') {
        console.log('Uploading MERGE_LOG');
        log.databaseRecord = data.melindaRecord || data.databaseRecord;
        log.preference = {recordName: (data.preferred === 'melindaRecord' ? 'databaseRecord' : data.preferred) || ''};
        delete log.melindaRecord;
        delete log.preferred;
      }

      if (data.logItemType === 'MATCH_LOG') {
        console.log('Uploading MATCH_LOG');
      }

      return log;
    }

    function selectLogType(logItemType) {
      const logType = document.querySelector(`#viewer #logType`);
      logType.value = logItemType;
    }
  }
};

window.exitReaderMode = function (event) {
  console.log('Exiting Viewer reader mode');
  eventHandled(event);

  const toolbar = document.getElementById('viewerTools');
  const allElements = getAllDescendants(toolbar);

  allElements.forEach(element => {
    enableElement(element);
  });

  const readMode = document.getElementById('readMode');
  readMode.style.display = 'none';

  const exitButton = document.getElementById('exit');
  disableElement(exitButton);
  exitButton.style.display = 'none';

  clearLogView();
};

function showReaderMode() {
  console.log('Viewer is now in reader mode: records are read only');

  const sequenceInputField = document.getElementById('sequenceInput');
  const sequenceSelect = document.getElementById('sequence');
  sequenceInputField.style.display = 'block';
  sequenceSelect.style.display = 'none';

  const toolbar = document.getElementById('viewerTools');
  const allElements = getAllDescendants(toolbar);
  allElements.forEach(element => {
    disableElement(element);
  });

  const uploadButton = document.getElementById('import');
  enableElement(uploadButton);

  const showLogInfoButton = document.getElementById('showLogInfo');
  const hideLogInfoButton = document.getElementById('hideLogInfo');
  enableElement(showLogInfoButton);
  enableElement(hideLogInfoButton);

  const exitButton = document.getElementById('exit');
  exitButton.style.display = 'flex';
  enableElement(exitButton);

  const readMode = document.getElementById('readMode');
  readMode.style.display = 'flex';
}

export function checkFile(file) {
  console.log('Checking uploaded file...');
  const confirmUploadButton = document.getElementById('confirmUploadButton');
  const fileNameDiv = document.getElementById('selectedFileName');

  if (!file) {
    console.log('No file to check!');
    disableElement(confirmUploadButton);
    return;
  }

  if (file.size === 0) {
    console.log('File is empty!');
    disableElement(confirmUploadButton);
    highlightElement(fileNameDiv, 'var(--color-functional-red)');
    showSnackbar({style: 'alert', text: 'Tyhjää tiedostoa ei voi avata, tarkista tiedoston sisältö!'});
    return;
  }

  if (file.type !== 'application/json' && file.type !== 'text/plain') {
    console.log(`File type '${file.type}' is not accepted for upload!`);
    confirmUploadButton.title = 'Valitse ensin .json- tai .txt-päätteinen tiedosto';
    disableElement(confirmUploadButton);
    highlightElement(fileNameDiv, 'var(--color-functional-red)');
    showSnackbar({style: 'alert', text: 'Vain .json- tai .txt-tiedostot hyväksytään, tarkista tiedoston tyyppi!'});
    return;
  }

  confirmUploadButton.removeAttribute('title');
  enableElement(confirmUploadButton);
  highlightElement(fileNameDiv, 'var(--color-functional-green)');
}
