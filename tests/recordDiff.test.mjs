import {describe, test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareRecords} from '../src/scripts/recordDiff.mjs';

// Match compare mode of the match log view: the diff of the incoming record
// and the matching Melinda record (src/scripts/recordDiff.mjs).
// Fixture: a match log whose merge was refused because field 245 failed (IDs anonymized).

const log = JSON.parse(readFileSync(new URL('./fixtures/matchLog.json', import.meta.url), 'utf8'));
const {rows, summary} = compareRecords(log.incomingRecord, log.matchResult[0].candidate.record);

const rowsOf = tag => rows.filter(row => row.tag === tag);
const marked = (parts, side = 'incoming') => parts[side].subfields
  .filter(({mark}) => mark !== 'none')
  .map(({subfield, mark, words}) => mark === 'words' ? `${subfield.code}:${words.filter(w => w.differs).map(w => w.text).join('|')}` : `${subfield.code}=${subfield.value}`);

function field(tag, ind1, ind2, subfields) {
  return {tag, ind1, ind2, subfields: subfields.map(([code, value]) => ({code, value}))};
}

describe('compareRecords with a match log', () => {
  test('summary counts the rows that are not identifiers or Melinda internal fields', () => {
    assert.deepEqual(summary, {changed: 7, incoming: 4, melinda: 3, same: 17});
  });

  test('every field of both records is in exactly one row, in Melinda order', () => {
    const incoming = rows.filter(row => row.incoming).length;
    const melinda = rows.filter(row => row.melinda).map(row => row.melinda);
    const melindaRecord = log.matchResult[0].candidate.record;

    assert.equal(incoming, log.incomingRecord.fields.length + 1);
    assert.deepEqual(melinda.slice(1), melindaRecord.fields);
  });

  test('leader and 008 mark the character positions that differ', () => {
    const [f008] = rowsOf('008');
    assert.equal(f008.status, 'changed');
    assert.deepEqual([...f008.parts.incoming.positions], [3, 5]);
    assert.equal(rowsOf('LDR')[0].status, 'changed');
  });

  test('a changed subfield marks only the words that differ', () => {
    const [f245] = rowsOf('245');
    assert.equal(f245.status, 'changed');
    assert.deepEqual(marked(f245.parts), ['a:Sports|Resort']);
    assert.deepEqual(marked(f245.parts, 'melinda'), ['a:sports|resert']);
  });

  test('a subfield found in one record only is marked whole', () => {
    const [f300] = rowsOf('300');
    assert.deepEqual(marked(f300.parts), []);
    assert.deepEqual(marked(f300.parts, 'melinda'), ['e=+leg strap']);
  });

  test('different indicators are marked', () => {
    const [changed] = rowsOf('024').filter(row => row.status === 'changed');
    assert.equal(changed.parts.incoming.indicators, true);
    assert.equal(changed.incoming.ind1, '1');
    assert.equal(changed.melinda.ind1, '3');
  });

  test('two different identifiers in 035 are not paired', () => {
    assert.deepEqual(rowsOf('035').map(row => row.status).sort(), ['incoming', 'melinda']);
  });

  test('identifiers and Melinda internal fields are noise', () => {
    assert.deepEqual([...new Set(rows.filter(row => row.noise).map(row => `${row.tag}:${row.noise}`))].sort(),
      ['001:identifier', '003:identifier', '005:identifier', '884:internal', 'CAT:internal', 'SID:internal']);
  });
});

describe('compareRecords edge cases', () => {
  test('identical records are all same', () => {
    const record = {leader: '00000nam a2200000 i 4500', fields: [{tag: '008', value: 'abc'}, field('245', '1', '0', [['a', 'Title']])]};
    const result = compareRecords(record, structuredClone(record));
    assert.deepEqual(result.rows.map(row => row.status), ['same', 'same', 'same']);
    assert.deepEqual(result.summary, {changed: 0, incoming: 0, melinda: 0, same: 3});
  });

  test('a missing record compares as an empty one', () => {
    const record = {fields: [field('245', '1', '0', [['a', 'Title']])]};
    assert.deepEqual(compareRecords(record, undefined).rows.map(row => row.status), ['incoming']);
    assert.deepEqual(compareRecords({}, record).rows.map(row => row.status), ['melinda']);
  });

  test('a repeated field pairs with its most similar counterpart', () => {
    const incoming = {fields: [field('650', ' ', '7', [['a', 'kissat'], ['2', 'yso/fin']]), field('650', ' ', '7', [['a', 'koirat'], ['2', 'yso/fin']])]};
    const melinda = {fields: [field('650', ' ', '7', [['a', 'koirat'], ['2', 'yso/fin']]), field('650', ' ', '7', [['a', 'kissat.'], ['2', 'yso/fin']])]};
    const result = compareRecords(incoming, melinda);
    assert.deepEqual(result.rows.map(row => `${row.status}:${row.incoming?.subfields[0].value}>${row.melinda?.subfields[0].value}`),
      ['same:koirat>koirat', 'changed:kissat>kissat.']);
  });
});
