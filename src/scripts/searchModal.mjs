//-----------------------------------------------------------------------------
// Functions for search modal: filtering and selecting correlation id from list
//-----------------------------------------------------------------------------

/* Local imports */
import {idbClearList, idbGetList, idbSetList} from '/scripts/indexedDB.mjs';
import {getCorrelationIdList} from '/scripts/callRest.mjs';

/* Shared imports */
import {highlightElement} from '/shared/scripts/elements.js';
import {startProcess, stopProcess} from '/shared/scripts/progressbar.js';
import {showSnackbar} from '/shared/scripts/snackbar.js';
import {eventHandled} from '/shared/scripts/uiUtils.js';

/* Local globals defined in Viewer app */
/* global
    clearFilters, doSearchPress, modalClose, updateOnChange
*/


export const oneDayInMs = 1 * 24 * 60 * 60 * 1000;


window.openCorrelationIdListModal = function (event = undefined) {
  const modal = document.querySelector(`#correlationIdListModal`);

  modal.style.display = 'flex';
  clearListView();
  fetchCorrelationIdList();
};

window.updateOnChange = (event) => {
  eventHandled(event);
  updateCorrelationIdListModal();
};

window.goToTop = function (event = undefined) {
  eventHandled(event);
  const modal = document.querySelector(`#correlationIdListModal`);
  modal.scrollTo({top: 0, behavior: 'smooth'});
};

window.modalClose = function (event) {
  eventHandled(event);
  const modal = document.querySelector('#correlationIdListModal');
  modal.style.display = 'none';
};

window.toggleListDetails = function (event = undefined) {
  eventHandled(event);
  const toggleListDetailsButton = document.getElementById('toggleListDetails');
  toggleFilterButton(toggleListDetailsButton);
  updateOnChange(new Event('change'));
};

window.toggleShowLogsByCreationDate = function (clickedDateButton) {
  const dateStartInput = document.querySelector(`#correlationIdListModal #dateStartInput`);
  const dateEndInput = document.querySelector(`#correlationIdListModal #dateEndInput`);
  const todayButton = document.getElementById('creationTimeToday');
  const weekAgoButton = document.getElementById('creationTimeWeekAgo');

  const dateFormatter = Intl.DateTimeFormat('sv-SE');
  const dateToday = dateFormatter.format(new Date());
  const dateOverSevenDaysAgo = dateFormatter.format(new Date() - 7 * oneDayInMs);

  if (clickedDateButton === 'today') {
    toggleFilterButton(todayButton);

    todayButton.dataset.value === 'true'
      ? (dateStartInput.value = dateToday, dateEndInput.value = dateToday)
      : (dateStartInput.value = '', dateEndInput.value = '');

    if (todayButton.dataset.value === 'true' && weekAgoButton.dataset.value === 'true') {
      toggleFilterButton(weekAgoButton);
    }
  }

  if (clickedDateButton === 'weekAgo') {
    toggleFilterButton(weekAgoButton);

    weekAgoButton.dataset.value === 'true'
      ? (dateEndInput.value = dateOverSevenDaysAgo, dateStartInput.value = '')
      : (dateEndInput.value = '', dateEndInput.value = '');

    if (weekAgoButton.dataset.value === 'true' && todayButton.dataset.value === 'true') {
      toggleFilterButton(todayButton);
    }
  }

  updateOnChange(new Event('change'));

};

window.clearFilters = function (event = undefined) {

  if (!event) {
    resetDateFilteringButtons();
    return;
  }

  if (event.target.id === 'clearFiltersButton') {
    resetDateFilteringButtons();
    resetFilteringInputs();
    resetLogTypeFilteringButtons();
    resetCatalogerFilteringButtons();
    resetDetailsButton();
    updateOnChange(event);
  }

  function resetDateFilteringButtons() {
    const todayButton = document.getElementById('creationTimeToday');
    const weekAgoButton = document.getElementById('creationTimeWeekAgo');
    unselectFilteringButtons(todayButton, weekAgoButton);
    setDefaultTitles(todayButton, weekAgoButton);
  }

  function resetFilteringInputs() {
    const dateStartInput = document.querySelector(`#correlationIdListModal #dateStartInput`);
    const dateEndInput = document.querySelector(`#correlationIdListModal #dateEndInput`);
    const correlationIdInput = document.getElementById(`correlationIdInput`);

    dateStartInput.value = '';
    dateEndInput.value = '';
    correlationIdInput.value = '';
  }

  function resetLogTypeFilteringButtons() {
    const logTypeButtons = document.getElementById('logTypeToggleContainer').children;

    selectFilteringButtons(...logTypeButtons);
    setDefaultTitles(...logTypeButtons);
  }

  function resetDetailsButton() {
    const listDetailsSelect = document.querySelector(`#correlationIdListModal #toggleListDetails`);

    selectFilteringButtons(listDetailsSelect);
    setDefaultTitles(listDetailsSelect);
  }

  function resetCatalogerFilteringButtons() {
    const catalogerButtons = document.getElementById('catalogerToggleContainer').children;

    selectFilteringButtons(...catalogerButtons);
    setDefaultTitles(...catalogerButtons);
  }

  function unselectFilteringButtons(...buttons) {
    buttons.forEach(button => {
      button.dataset.value = 'false';
      button.classList.remove('select-button-selected');
    });
  }

  function selectFilteringButtons(...buttons) {
    buttons.forEach(button => {
      button.dataset.value = 'true';
      button.classList.add('select-button-selected');
    });
  }

  function setDefaultTitles(...buttons) {
    buttons.forEach(button => button.title = button.dataset.titleA);
  }
};

export function unselectDateButtons() {
  const todayButton = document.getElementById('creationTimeToday');
  const weekAgoButton = document.getElementById('creationTimeWeekAgo');

  if (todayButton.classList.contains('select-button-selected') || weekAgoButton.classList.contains('select-button-selected')) {
    clearFilters();
  }
}

function toggleFilterButton(filterButton) {
  const filterButtonValue = filterButton.dataset.value;
  const {titleA} = filterButton.dataset;
  const {titleB} = filterButton.dataset;

  filterButton.dataset.value = filterButtonValue !== 'true';
  filterButton.classList.toggle('select-button-selected');
  filterButton.title = filterButton.title === titleA ? titleB : titleA;
}

function clearListView() {
  const correlationIdList = document.querySelector(`#correlationIdListModal #correlationIdList`);
  const selectSorting = document.querySelector(`#correlationIdListModal #correlationIdListSorting`);
  const infoTextDiv = document.getElementById(`lastSearchedInfoText`);

  const dateStartInput = document.getElementById(`dateStartInput`);
  const dateEndInput = document.getElementById(`dateEndInput`);

  const filterButtons = document.querySelectorAll('.select-button');

  correlationIdList.replaceChildren();
  selectSorting.style.visibility = 'hidden';
  infoTextDiv.classList.remove('link-active');

  if (dateStartInput.value === '') {
    dateStartInput.setAttribute('type', 'text');
    dateStartInput.placeholder = 'Alkupvm';
  }

  if (dateEndInput.value === '') {
    dateEndInput.setAttribute('type', 'text');
    dateEndInput.placeholder = 'Loppupvm';
  }

  filterButtons.forEach((button) => {
    if (button.title === '') {
      button.title = button.dataset.titleA;
    }
  });

  setOrClearErrorMessageAndStyle({clear: true});
}

function fetchCorrelationIdList() {
  const expanded = '1';
  const logItemTypes = ['MATCH_LOG', 'MERGE_LOG'];

  startProcess();
  idbClearList();

  getCorrelationIdList(expanded, logItemTypes)
    .then((data) => {
      testIfObjects(data);
      setCorrelationIdListDataToIndexedDB(data);
    })
    .catch((error) => {
      setOrClearErrorMessageAndStyle({set: true, text: 'Valitettavasti listaa ei pystytty juuri nyt hakemaan'});
      console.log('Error while fetching correlation id list: ', error);
      stopProcess();
    });


  function testIfObjects(elements) {
    const objects = elements.filter(element => typeof element === 'object');

    if (objects.length !== elements.length) {
      throw new Error('Correlation id list should contain only objects');
    }
  }
}

function updateCorrelationIdListModal() {
  clearListView();

  idbGetList('correlationIdList')
    .then((data) => {
      updateListView(data);
    })
    .catch((error) => {
      console.log('Error getting correlation id list from indexedDB (if undefined, probably it is not yet set): ', error);
      showSnackbar({style: 'info', text: 'Odota hetki listan päivittymistä'});
    });
}

function setCorrelationIdListDataToIndexedDB(data) {
  idbSetList('correlationIdList', data);
  console.log('Correlation id list: ', data);
  updateOnChange(new Event('change'));
}

function updateListView(correlationIdList) {
  updateToggleButtons();
  const updatedList = filterAndSortCorrelationIdList();
  showSearchResultsInfo(updatedList.length, correlationIdList.length);

  if (updatedList.length === 0) {
    stopProcess();
    return;
  }

  updatedList.forEach((logItem) => createListItem(logItem));
  showListSortingOptions();
  showListDetails();
  highlightMatches();
  stopProcess();

  function updateToggleButtons() {
    updateFilterButtons('logTypeToggleContainer', 'logItemType');
    updateFilterButtons('catalogerToggleContainer', 'cataloger');

    function updateFilterButtons(containerId, filterProperty) {
      const currentList = [...document.querySelectorAll(`#${containerId} [id]`)].map((element) => element.id);
      const updatedList = Array.from(new Set(correlationIdList.map((listItem) => listItem[`${filterProperty}`])));

      // if null is present, change it to 'NULL'
      if (updatedList.includes(null)) {
        updatedList.splice(updatedList.indexOf(null), 1, 'NULL');
      }

      const newItems = updatedList.filter(item => !currentList.includes(item));
      const oldItems = currentList.filter(item => !updatedList.includes(item));

      // move 'NULL' to be the last list item
      newItems.sort(item => item === 'NULL' ? 1 : -1);

      // TODO => handle case: if too many items, segmented button cannot be used
      addNew(newItems);
      removeOld(oldItems);

      function addNew(newItems) {
        newItems.forEach(item => {
          createNewButton(item);
        });

        function createNewButton(item) {
          const button = createButton(item);

          const container = document.getElementById(containerId);
          container.append(button);

          function createButton(item) {
            const template = document.getElementById('buttonTemplate');
            const buttonFragment = template.content.cloneNode(true);
            const button = buttonFragment.getElementById('segmentedSelectButton');

            button.id = item;
            button.querySelector(`.select-button-text`).innerHTML = item;
            button.dataset.titleA = `Piilota ${item} listanäkymästä`;
            button.dataset.titleB = `Näytä  ${item} listanäkymässä`;

            button.title = button.dataset.titleA;

            button.addEventListener('click', () => {
              toggleShowLogsByFilter(item);
            });

            return button;

            function toggleShowLogsByFilter(item) {
              const toggleItemButton = document.querySelector(`#correlationIdListModal #${item}`);
              toggleFilterButton(toggleItemButton);
              updateOnChange(new Event('change'));
            }
          }
        }
      }

      function removeOld(oldItems) {
        oldItems.forEach(item => {
          const element = document.getElementById(item);
          element.parentNode.removeChild(element);
        });
      }
    }
  }

  function filterAndSortCorrelationIdList() {
    const filters = [
      filterListWithLogTypes,
      filterListWithCatalogers,
      filterListWithDates,
      filterListWithSearchString,
      sortList
    ];

    return applyFiltersPump(filters, correlationIdList);

    function applyFiltersPump(listEnabledFilters, logList = []) {
      const [enabledFilter, ...rest] = listEnabledFilters;
      if (enabledFilter === undefined) {
        return logList;
      }

      const updatedList = enabledFilter(logList);
      return applyFiltersPump(rest, updatedList);
    }

    function filterListWithLogTypes(list) {
      const logTypeButtons = document.querySelectorAll(`#logTypeToggleContainer [id]`);

      const selectedLogTypes = [];

      logTypeButtons.forEach(button => {
        if (button.dataset.value === 'true') {
          selectedLogTypes.push(button.id);
        }
      });

      // handle if logItemType is null
      list.map(logItem => {
        if (logItem.logItemType === null) {
          logItem.logItemType = 'NULL';
        }
      });

      return list.filter(logItem => selectedLogTypes.includes(logItem.logItemType));
    }

    function filterListWithCatalogers(list) {
      const catalogerButtons = document.querySelectorAll(`#catalogerToggleContainer [id]`);
      const selectedCatalogers = [];

      catalogerButtons.forEach(button => {
        if (button.dataset.value === 'true') {
          selectedCatalogers.push(button.id);
        }
      });

      // handle if cataloger is null
      list.map(logItem => {
        if (logItem.cataloger === null) {
          logItem.cataloger = 'NULL';
        }
      });

      return list.filter(logItem => selectedCatalogers.includes(logItem.cataloger));
    }

    function filterListWithDates(list) {
      const startDate = document.getElementById(`dateStartInput`).value;
      const endDate = document.getElementById(`dateEndInput`).value;
      if (startDate !== '' && endDate !== '') {
        return list.filter(logItem => getDate(logItem) >= startDate && getDate(logItem) <= endDate);
      }

      if (startDate !== '' && endDate === '') {
        return list.filter(logItem => getDate(logItem) >= startDate);
      }

      if (startDate === '' && endDate !== '') {
        return list.filter(logItem => getDate(logItem) <= endDate);
      }

      return list;

      function getDate(logItem) {
        return logItem.creationTime.substring(0, 10);
      }
    }
  }

  function filterListWithSearchString(list) {
    const searchString = document.getElementById(`correlationIdInput`).value;

    return list.filter(logItem => logItem.correlationId.includes(searchString));
  }

  function sortList(list) {
    const sortingMethod = document.getElementById(`correlationIdListSorting`).value;

    if (sortingMethod === 'sortById') {
      return list.sort(compareLogItemsByIdAndType);
    }

    if (sortingMethod === 'sortByTimeOldestFirst') {
      return list.sort(compareLogItemsByTime);
    }

    if (sortingMethod === 'sortByTimeNewestFirst') {
      return list.sort(compareLogItemsByTime).reverse();
    }

    return list;

    function compareLogItemsByIdAndType(logItemA, logItemB) {
      return logItemA.correlationId.localeCompare(logItemB.correlationId) || logItemB.logItemType.localeCompare(logItemA.logItemType);
    }

    function compareLogItemsByTime(logItemA, logItemB) {
      return logItemA.creationTime.localeCompare(logItemB.creationTime);
    }

  }
}

function showSearchResultsInfo(found, total) {
  const styledResult = `<span class="styled-result">&nbsp;${found}&nbsp;</span>`;
  showPlaceholderText(`Näytetään ${styledResult}/${total} ID:tä`);
}

function createListItem(logItem) {
  const listItemDiv = createListItemDiv(logItem);
  const correlationIdList = document.querySelector(`#correlationIdListModal #correlationIdList`);
  correlationIdList.append(listItemDiv);

  function createListItemDiv({correlationId, logItemType, cataloger, creationTime, logCount}) {
    const template = document.getElementById('listItemTemplate');
    const listItemFragment = template.content.cloneNode(true);
    const listItem = listItemFragment.getElementById('listItem');

    // logItem's correlationId is not unique, so the id for listItem is created using two logItem attributes
    listItem.id = `${correlationId}:${logItemType}`;
    listItem.querySelector(`.list-item-id`).innerHTML = correlationId;

    const logTypeText = `Lokityyppi: ${styleBold(logItemType)}`;
    const catalogerText = `Luetteloija: ${styleBold(cataloger)}`;
    const creationTimeText = `Luontiaika: ${styleBold(creationTime.substring(0, 10))} ${styleBold(creationTime.substring(11, 22))}`;
    const logCountText = `Lokilukumäärä: ${styleBold(logCount)}`;

    const logTypeDiv = createDivWithInnerHtml(logTypeText);
    const catalogerDiv = createDivWithInnerHtml(catalogerText);
    const creationTimeDiv = createDivWithInnerHtml(creationTimeText);
    const logCountDiv = createDivWithInnerHtml(logCountText);

    listItem.querySelector(`.list-item-details`).append(logTypeDiv, catalogerDiv, creationTimeDiv, logCountDiv);

    listItem.addEventListener('click', () => {
      searchWithSelectedIdAndType(correlationId, logItemType);
    });

    const overWeekOld = Date.parse(logItem.creationTime) < Date.now() - 7 * oneDayInMs;

    if (overWeekOld) {
      const infoIcon = document.createElement('span');
      infoIcon.classList.add('material-icons');
      infoIcon.innerHTML = 'lock_clock';
      infoIcon.title = 'Tämä ID on yli 7 vrk vanha, joten se saattaa olla turvattu';
      listItem.querySelector(`.list-item-icons`).prepend(infoIcon);
    }

    return listItem;

    function createDivWithInnerHtml(text) {
      const divElement = document.createElement('div');
      divElement.innerHTML = text;
      return divElement;
    }

    function searchWithSelectedIdAndType(correlationId, logItemType) {
      const id = document.querySelector(`#viewer #id`);
      const logType = document.querySelector(`#viewer #logType`);
      const sequenceInputField = document.querySelector(`#viewer #sequenceInput`);
      const sequenceSelect = document.querySelector(`#viewer #sequence`);

      id.value = correlationId;
      logType.value = logItemType;
      sequenceInputField.value = '';
      sequenceSelect.value = '';

      doSearchPress();
      modalClose();
    }

    function styleBold(text) {
      return `<span style="font-weight: bold">${text}</span>`;
    }
  }
}

function showListSortingOptions() {
  const selectSorting = document.getElementById(`correlationIdListSorting`);
  selectSorting.style.visibility = 'visible';
}

function showListDetails() {
  const listDetailsDivs = document.querySelectorAll(`#correlationIdListModal #correlationIdList .list-item-details`);
  const showListDetailsValue = document.querySelector(`#correlationIdListModal #toggleListDetails`).dataset.value;
  listDetailsDivs.forEach((div) => showListDetailsValue === 'true' ? div.style.display = 'flex' : div.style.display = 'none');
}

function highlightMatches() {
  highlightSearchStringMatches();
  highlightLastSearchedListItem();

  function highlightSearchStringMatches() {
    const searchString = document.getElementById(`correlationIdInput`).value;

    if (searchString !== '') {
      stylePatternMatches(searchString);
    }

    function stylePatternMatches() {
      const listItemIdDivs = document.querySelectorAll(`#correlationIdListModal #correlationIdList .list-item-id`);

      const styledString = `<span style="background-color:var(--color-green-60)">${searchString}</span>`;
      const regExp = new RegExp(`${searchString}`, 'g');

      listItemIdDivs.forEach(listItemId => listItemId.innerHTML = listItemId.innerHTML.replace(regExp, styledString));
    }
  }

  function highlightLastSearchedListItem() {
    const lastSearchedCorrelationId = document.querySelector(`#lastSearchedInfoText span`)?.innerHTML;
    const lastSearchedLogType = document.getElementById(`logType`).value;
    const id = `${lastSearchedCorrelationId}:${lastSearchedLogType}`;
    const lastSearchedListItem = document.getElementById(id);

    if (!lastSearchedListItem) {
      return;
    }

    lastSearchedListItem.classList.add('last-searched');

    addSelectedIcon();
    updateSearchIcon();
    addLinkToListItem();

    function addSelectedIcon() {
      const selectedIcon = document.createElement('span');
      selectedIcon.classList.add('material-icons', 'selected-list-item-check-icon');
      selectedIcon.innerHTML = 'check';
      lastSearchedListItem.querySelector(`.list-item-icons`).append(selectedIcon);
    }

    function updateSearchIcon() {
      const searchIcon = document.querySelector(`.last-searched .list-item-icons-search`);
      searchIcon.innerHTML = 'find_replace';
      searchIcon.title = 'Hae uudelleen tällä ID:llä';
    }

    function addLinkToListItem() {
      const infoTextDiv = document.getElementById('lastSearchedInfoText');
      const infoTextSpan = document.querySelector(`#lastSearchedInfoText span`);

      infoTextDiv.classList.add('link-active');
      infoTextSpan.title = 'Siirry listanäkymässä tämän ID:n kohdalle';

      infoTextSpan.addEventListener('click', () => {
        lastSearchedListItem.scrollIntoView({behavior: 'smooth', block: 'center'});
        highlightElement(lastSearchedListItem, 'var(--color-green-60)');
      });
    }
  }
}

function setOrClearErrorMessageAndStyle({clear = false, set = false, text = 'Sorry, something bad happened'}) {
  const errorMessagePlaceholder = document.getElementById('errorFetchingListPlaceholder');
  const errorMessage = document.querySelector(`#errorFetchingListPlaceholder .error-message-text`);
  const filteringButtonsDiv = document.getElementById('filteringButtons');
  const filteringInputsDiv = document.getElementById('filteringInputs');
  const searchResultsAndSortingDiv = document.getElementById('searchResultsAndSorting');
  const correlationIdListDiv = document.getElementById('correlationIdList');
  const modalBottomDiv = document.getElementById('modalBottomDiv');

  if (set) {
    errorMessagePlaceholder.style.display = 'flex';
    errorMessage.innerHTML = text;
    setDivsDisplayNone(searchResultsAndSortingDiv, correlationIdListDiv, modalBottomDiv);
    setDivsDisabled(filteringButtonsDiv, filteringInputsDiv);
  }

  if (clear) {
    errorMessagePlaceholder.style.display = 'none';
    errorMessage.innerHTML = '';
    setDivsDisplayFlex(searchResultsAndSortingDiv, correlationIdListDiv, modalBottomDiv);
    setDivsEnabled(filteringButtonsDiv, filteringInputsDiv);
  }

  function setDivsDisplayNone(...elements) {
    elements.forEach(element => element.style.display = 'none');
  }

  function setDivsDisabled(...elements) {
    elements.forEach(element => element.classList.add('disabled-div'));
  }

  function setDivsDisplayFlex(...elements) {
    elements.forEach(element => element.style.display = 'flex');
  }

  function setDivsEnabled(...elements) {
    elements.forEach(element => element.classList.remove('disabled-div'));
  }
}

function showPlaceholderText(text) {
  const placeholderText = document.getElementById('fetchListPlaceholderText');
  placeholderText.innerHTML = text;
}
