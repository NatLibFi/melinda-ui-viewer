//****************************************************************************//
//                                                                            //
// Record diff for the match log view: the incoming record compared to the    //
// matching Melinda record. Pure functions, no DOM (tests/recordDiff.test.mjs)//
//                                                                            //
//****************************************************************************//
//
// compareRecords(incomingRecord, melindaRecord) returns {rows, summary}.
//
// rows: one row per field pair, in Melinda's field order. A field found only
// in the incoming record goes after the field its previous incoming field is
// paired with, so it stays next to its neighbours:
//
//    {
//      tag,
//      incoming: field | null,
//      melinda: field | null,
//      status: 'same' | 'changed' | 'incoming' | 'melinda',
//      noise: 'identifier' | 'internal' | null,
//      parts: {incoming, melinda}   // only when status is 'changed'
//    }
//
// The leader is compared as a field with the tag LDR.
//
// How fields are paired, tag by tag:
//    1. identical fields
//    2. the most similar remaining fields: a control field pairs with the
//       control field of the same tag; a data field pairs only when at least
//       40 % of the words are shared, so two different identifiers in 035
//       stay as two separate fields
//    3. the rest exist only in one record
//
// parts of a changed field tell which parts differ:
//    - control field (LDR, 008): {positions: Set of the character indexes that differ}
//    - data field: {indicators: boolean, subfields: [{subfield, mark, words}]}
//      mark 'none': the same subfield is in the other record
//      mark 'whole': the subfield is only in this record
//      mark 'words': the other record has the same code with another value;
//                    words is [{text, differs}] split at whitespace
//
// noise: fields that always differ (001, 003, 005) or exist only in Melinda
// (CAT, LOW, SID, 884). They are not counted in the summary.
//
// summary: {changed, incoming, melinda, same}, counts of the non-noise rows.

export const IDENTIFIER_TAGS = ['001', '003', '005'];
export const MELINDA_INTERNAL_TAGS = ['CAT', 'LOW', 'SID', '884'];

const MIN_SHARED_WORDS = 0.4;


export function compareRecords(incomingRecord, melindaRecord) {
  const incomingFields = recordToFields(incomingRecord);
  const melindaFields = recordToFields(melindaRecord);
  const tags = [...new Set([...incomingFields, ...melindaFields].map(f => f.tag))];

  const rows = tags.flatMap(tag => pairFields(
    incomingFields.filter(f => f.tag === tag),
    melindaFields.filter(f => f.tag === tag)
  ));

  const sortedRows = rows
    .map(row => ({...row, noise: getNoise(row.tag), parts: row.status === 'changed' ? diffField(row.incoming.field, row.melinda.field) : undefined}))
    .map(addPosition(rows))
    .sort((x, y) => x.position - y.position)
    .map(({incoming, melinda, position, ...row}) => ({...row, incoming: incoming?.field ?? null, melinda: melinda?.field ?? null}));

  return {rows: sortedRows, summary: summarize(sortedRows)};
}


//****************************************************************************//

function recordToFields(record = {}) {
  const leader = record.leader ? [{tag: 'LDR', value: record.leader}] : [];
  return [...leader, ...(record.fields ?? [])].map((field, index) => ({tag: field.tag, field, index}));
}

function pairFields(incoming, melinda) {
  const rows = [];
  const paired = new Set();

  incoming.forEach(a => {
    const b = melinda.find(candidate => !paired.has(candidate) && fieldKey(candidate.field) === fieldKey(a.field));
    if (b) {
      paired.add(a).add(b);
      rows.push({tag: a.tag, incoming: a, melinda: b, status: 'same'});
    }
  });

  incoming
    .filter(a => !paired.has(a))
    .flatMap(a => melinda.filter(b => !paired.has(b)).map(b => ({a, b, score: similarity(a.field, b.field)})))
    .filter(({score}) => score > 0)
    .sort((x, y) => y.score - x.score)
    .forEach(({a, b}) => {
      if (!paired.has(a) && !paired.has(b)) {
        paired.add(a).add(b);
        rows.push({tag: a.tag, incoming: a, melinda: b, status: 'changed'});
      }
    });

  incoming.filter(a => !paired.has(a)).forEach(a => rows.push({tag: a.tag, incoming: a, melinda: null, status: 'incoming'}));
  melinda.filter(b => !paired.has(b)).forEach(b => rows.push({tag: b.tag, incoming: null, melinda: b, status: 'melinda'}));

  return rows;
}

// Position of a row: the index of its Melinda field. A field only in the incoming
// record gets the position of the Melinda field paired with the closest previous
// incoming field, plus a fraction that keeps the incoming order
function addPosition(rows) {
  const melindaIndexOfIncoming = new Map(rows.filter(row => row.incoming && row.melinda).map(row => [row.incoming.index, row.melinda.index]));

  return row => {
    if (row.melinda) {
      return {...row, position: row.melinda.index};
    }

    let previous = row.incoming.index - 1;
    while (previous >= 0 && !melindaIndexOfIncoming.has(previous)) {
      previous--;
    }
    const base = previous >= 0 ? melindaIndexOfIncoming.get(previous) : -1;

    return {...row, position: base + ((row.incoming.index + 1) / 100000)};
  };
}

function getNoise(tag) {
  if (IDENTIFIER_TAGS.includes(tag)) {
    return 'identifier';
  }
  if (MELINDA_INTERNAL_TAGS.includes(tag)) {
    return 'internal';
  }
  return null;
}

function fieldKey(field) {
  if (!field.subfields) {
    return `${field.tag} ${field.value}`;
  }
  return `${field.tag}${field.ind1}${field.ind2}${field.subfields.map(sf => `$${sf.code}${sf.value}`).join('')}`;
}

function similarity(a, b) {
  if (!a.subfields || !b.subfields) {
    return a.subfields || b.subfields ? 0 : 1;
  }

  const aWords = words(a);
  const bWords = new Set(words(b));
  const shared = aWords.filter(word => bWords.has(word)).length / Math.max(aWords.length, bWords.size, 1);

  if (shared < MIN_SHARED_WORDS) {
    return 0;
  }

  const bSubfields = new Set(b.subfields.map(sf => sf.code + sf.value));
  return (a.subfields.filter(sf => bSubfields.has(sf.code + sf.value)).length * 10) + shared;

  function words(field) {
    return field.subfields.flatMap(sf => sf.value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  }
}


//****************************************************************************//

function diffField(a, b) {
  if (!a.subfields || !b.subfields) {
    return {incoming: diffValue(a.value, b.value), melinda: diffValue(b.value, a.value)};
  }

  const indicators = a.ind1 !== b.ind1 || a.ind2 !== b.ind2;
  const {incoming, melinda} = diffSubfields(a.subfields, b.subfields);

  return {
    incoming: {indicators, subfields: incoming},
    melinda: {indicators, subfields: melinda}
  };
}

function diffValue(value = '', other = '') {
  const positions = new Set();
  for (let i = 0; i < Math.max(value.length, other.length); i++) {
    if (value[i] !== other[i]) {
      positions.add(i);
    }
  }
  return {positions};
}

function diffSubfields(a, b) {
  const result = {incoming: [], melinda: []};
  let onlyA = [];
  let onlyB = [];

  lcs(a, b, sf => sf.code + sf.value).forEach(({op, item}) => {
    if (op === 'a') {
      onlyA.push(item);
      return;
    }
    if (op === 'b') {
      onlyB.push(item);
      return;
    }
    flush();
    result.incoming.push({subfield: item, mark: 'none'});
    result.melinda.push({subfield: item, mark: 'none'});
  });
  flush();

  return result;

  // Between two common subfields: a subfield with the same code on both sides
  // is a changed value (words marked), the rest exist only on one side
  function flush() {
    const usedB = new Set();
    const wordsOfB = new Map();

    onlyA.forEach(subfield => {
      const other = onlyB.find(candidate => !usedB.has(candidate) && candidate.code === subfield.code);
      if (!other) {
        result.incoming.push({subfield, mark: 'whole'});
        return;
      }
      usedB.add(other);
      const ops = lcs(tokens(subfield.value), tokens(other.value), token => token);
      result.incoming.push({subfield, mark: 'words', words: toWords(ops, 'a')});
      wordsOfB.set(other, toWords(ops, 'b'));
    });

    onlyB.forEach(subfield => {
      result.melinda.push(usedB.has(subfield) ? {subfield, mark: 'words', words: wordsOfB.get(subfield)} : {subfield, mark: 'whole'});
    });

    onlyA = [];
    onlyB = [];
  }

  function toWords(ops, side) {
    return ops.filter(({op}) => op === 'same' || op === side).map(({op, item}) => ({text: item, differs: op !== 'same'}));
  }
}

function tokens(text) {
  return text.split(/(\s+)/u).filter(Boolean);
}

// Longest common subsequence: [{op: 'same' | 'a' | 'b', item}]
function lcs(a, b, key) {
  const table = Array.from({length: a.length + 1}, () => new Array(b.length + 1).fill(0));

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] = key(a[i]) === key(b[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;

  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && key(a[i]) === key(b[j])) {
      ops.push({op: 'same', item: a[i]});
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || table[i][j + 1] >= table[i + 1][j])) {
      ops.push({op: 'b', item: b[j]});
      j++;
    } else {
      ops.push({op: 'a', item: a[i]});
      i++;
    }
  }

  return ops;
}

function summarize(rows) {
  const count = status => rows.filter(row => row.status === status && !row.noise).length;
  return {changed: count('changed'), incoming: count('incoming'), melinda: count('melinda'), same: count('same')};
}
