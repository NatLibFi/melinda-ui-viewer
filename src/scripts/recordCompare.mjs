import {compareRecords} from '/scripts/recordDiff.mjs';

//****************************************************************************//
//                                                                            //
// Match compare mode of the match log view (styles/recordCompare.css)        //
//                                                                            //
//****************************************************************************//
//
// showMatchCompare(incomingRecord, melindaRecord) shows the incoming record
// (#record1) and the matching Melinda record (#record4) side by side with the
// fields aligned row by row: a field pair is on the same row, a field found
// in only one record leaves a gap in the other one. The parts that differ are
// marked. The bar above the records (#matchCompareBar) shows the counts and
// the filters.
//
// clearMatchCompare() ends the mode: the merge log view and the empty view
// call it before showing their records.
//
// The rows use the markup of marcRecordUi.js (row, tag, inds, subfield, code,
// value), so marc.css styles them as in the other views.

const PANEL = '#viewer .record-merge-panel';
const COMPARE_CLASS = 'match-compare';
const COLUMNS = {incoming: '#record1', melinda: '#record4'};


export function showMatchCompare(incomingRecord, melindaRecord) {
  const panel = document.querySelector(PANEL);
  const {rows, summary} = compareRecords(incomingRecord, melindaRecord);

  panel.classList.add(COMPARE_CLASS);

  Object.entries(COLUMNS).forEach(([side, selector]) => {
    const card = panel.querySelector(selector);
    const recordDiv = card.querySelector('.marc-record');

    recordDiv.replaceChildren(...rows.map(row => createRow(row, side)));

    // The column spans the header, the note and one grid row per field pair,
    // the card and the record use the rows of the column (subgrid)
    card.parentElement.style.gridRow = `1 / span ${rows.length + 2}`;
  });

  showBar(summary);
}

export function clearMatchCompare() {
  const panel = document.querySelector(PANEL);
  const bar = document.querySelector('#viewer #matchCompareBar');

  if (!panel.classList.contains(COMPARE_CLASS)) {
    return;
  }

  panel.classList.remove(COMPARE_CLASS);
  Object.values(COLUMNS).forEach(selector => {
    const card = panel.querySelector(selector);
    card.parentElement.style.gridRow = '';
    card.querySelector('.marc-record').replaceChildren();
  });
  bar.hidden = true;
}


//****************************************************************************//

function showBar(summary) {
  const bar = document.querySelector('#viewer #matchCompareBar');
  const panel = document.querySelector(PANEL);

  Object.entries(summary).forEach(([key, count]) => {
    bar.querySelector(`[data-count="${key}"]`).textContent = count;
  });

  if (!bar.dataset.initialized) {
    bar.dataset.initialized = 'true';
    const onlyDifferences = bar.querySelector('#matchCompareOnlyDifferences');
    const showNoise = bar.querySelector('#matchCompareShowNoise');

    onlyDifferences.addEventListener('change', () => panel.classList.toggle('match-compare-only-differences', onlyDifferences.checked));
    showNoise.addEventListener('change', () => panel.classList.toggle('match-compare-hide-noise', !showNoise.checked));
  }

  bar.hidden = false;
}

function createRow(row, side) {
  const field = row[side];
  const div = document.createElement('div');

  div.classList.add('row', `match-compare-${row.status}`);

  if (row.noise) {
    div.classList.add('match-compare-noise');
  }

  if (!field) {
    div.classList.add('match-compare-gap');
    div.setAttribute('aria-hidden', 'true');
    return div;
  }

  const parts = row.parts?.[side];
  const mark = `match-compare-mark-${side}`;

  div.append(span('tag', field.tag));

  if (!field.subfields) {
    div.append(span('inds', '  '));
    const value = span('value');
    [...field.value ?? ''].forEach((char, index) => {
      const text = char === ' ' ? '#' : char;
      value.append(parts?.positions.has(index) ? span(mark, text) : text);
    });
    div.append(value);
    return div;
  }

  const inds = span('inds', `${blank(field.ind1)}${blank(field.ind2)}`);
  if (parts?.indicators) {
    inds.classList.add(mark);
  }
  div.append(inds);

  const subfields = parts ? parts.subfields : field.subfields.map(subfield => ({subfield, mark: 'none'}));

  subfields.forEach(({subfield, mark: subfieldMark, words}) => {
    const element = span('subfield');
    const value = span('value');

    element.append(span('code', subfield.code), value);

    if (subfieldMark === 'whole') {
      element.classList.add(mark);
      value.textContent = subfield.value;
    } else if (subfieldMark === 'words') {
      element.classList.add(`match-compare-changed-${side}`);
      words.forEach(({text, differs}) => value.append(differs ? span(mark, text) : text));
    } else {
      value.textContent = subfield.value;
    }

    div.append(element);
  });

  return div;
}

function blank(indicator) {
  return !indicator || indicator === ' ' ? '#' : indicator;
}

function span(className, text) {
  const element = document.createElement('span');
  element.className = className;
  if (text !== undefined) {
    element.textContent = text;
  }
  return element;
}
