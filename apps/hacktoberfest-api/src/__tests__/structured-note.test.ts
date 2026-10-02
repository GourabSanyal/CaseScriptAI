import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  extractJsonText,
  validateStructuredNote,
} from '../domain/structured-note.js';

describe('validateStructuredNote', () => {
  it('accepts a valid SOAP JSON object', () => {
    const result = validateStructuredNote(
      JSON.stringify({
        subjective: 'Reports lighter sleep this week.',
        objective: 'Affect congruent; engaged in session.',
        assessment: 'Work-related stress with sleep disruption.',
        plan: 'Phone-free hour and breathing three evenings.',
      }),
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.note.plan.includes('breathing'), true);
    }
  });

  it('accepts fenced JSON and rejects empty sections', () => {
    const fenced = validateStructuredNote(`\`\`\`json
{"subjective":"ok enough","objective":"calm","assessment":"stress","plan":"walk"}
\`\`\``);
    assert.equal(fenced.ok, true);

    const empty = validateStructuredNote(
      JSON.stringify({
        subjective: 'ok',
        objective: '',
        assessment: 'x',
        plan: 'y',
      }),
    );
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.match(empty.error, /llm_missing_sections/);
  });

  it('rejects non-JSON', () => {
    const result = validateStructuredNote('Here is your note');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, 'llm_invalid_json');
  });
});

describe('extractJsonText', () => {
  it('slices the first balanced object from surrounding prose', () => {
    assert.equal(extractJsonText('prefix {"a":1} middle {"b":2}'), '{"a":1}');
  });
});

describe('validateStructuredNote with multiple objects', () => {
  it('skips placeholder schema examples and accepts the real note', () => {
    const raw = `
Here is the shape {"subjective":"...","objective":"...","assessment":"...","plan":"..."}
Final:
{"subjective":"Sleep lighter.","objective":"Engaged.","assessment":"Work stress.","plan":"Breathing nights."}
`;
    const result = validateStructuredNote(raw);
    assert.equal(result.ok, true);
  });
});
