import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildNotePdf } from '../pdf/build-note-pdf.js';
import type { StructuredNote } from '../domain/structured-note.js';

const fixtureNote: StructuredNote = {
  subjective: 'Client reports lighter sleep and looping work thoughts at 3am.',
  objective: 'Engaged in session; affect congruent with content.',
  assessment: 'Situational work stress with sleep disruption.',
  plan: 'Phone-free hour before bed; breathing three evenings; kitchen walk before Monday standup.',
};

describe('buildNotePdf', () => {
  it('returns non-empty PDF bytes for a fixture structured note', () => {
    const bytes = buildNotePdf(fixtureNote);
    assert.ok(bytes.length > 100);
    assert.equal(bytes.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.ok(bytes.includes(Buffer.from('Subjective'.toUpperCase(), 'utf8')) || bytes.includes(Buffer.from('SUBJECTIVE', 'utf8')));
  });
});
