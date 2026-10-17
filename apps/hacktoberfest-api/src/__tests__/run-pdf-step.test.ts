import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createMemoryRepo,
  withSessionDefaults,
} from './helpers/memory-session-repo.js';
import { runPdfStep } from '../pdf/run-pdf-step.js';

const note = {
  subjective: 'Sleep lighter this week with work stress.',
  objective: 'Engaged; affect congruent.',
  assessment: 'Situational stress with sleep disruption.',
  plan: 'Breathing three evenings; phone-free hour.',
};

describe('runPdfStep', () => {
  it('writes PDF bytes to the session and marks ready', async () => {
    const session = withSessionDefaults({
      id: '33333333-3333-3333-3333-333333333333',
      status: 'pdf_running',
      transcript: 'synthetic',
      noteJson: note,
    });
    const repo = createMemoryRepo(session);
    const result = await runPdfStep({ repo, sessionId: session.id });
    assert.equal(result.status, 'ready');
    assert.ok(result.pdfBytes);
    assert.equal(result.pdfBytes!.subarray(0, 5).toString('utf8'), '%PDF-');
    assert.equal(result.pdfPath, null);
  });

  it('is idempotent when ready and bytes exist; regenerates when missing', async () => {
    const id = '33333333-3333-3333-3333-333333333333';
    const repo = createMemoryRepo(
      withSessionDefaults({
        id,
        status: 'ready',
        noteJson: note,
        pdfBytes: Buffer.from('%PDF-1.4 existing'),
      }),
    );

    const first = await runPdfStep({ repo, sessionId: id });
    assert.equal(first.status, 'ready');
    assert.equal(first.pdfBytes!.toString('utf8'), '%PDF-1.4 existing');

    await repo.setPdfBytes(id, Buffer.alloc(0));
    // Empty buffer treated as missing — set to null via update
    const cleared = createMemoryRepo(
      withSessionDefaults({
        id,
        status: 'ready',
        noteJson: note,
        pdfBytes: null,
      }),
    );
    const second = await runPdfStep({ repo: cleared, sessionId: id });
    assert.equal(second.status, 'ready');
    assert.ok(second.pdfBytes && second.pdfBytes.length > 20);
    assert.equal(second.pdfBytes.subarray(0, 5).toString('utf8'), '%PDF-');
  });

  it('marks failed with pdf_missing_note when note_json is invalid', async () => {
    const session = withSessionDefaults({
      id: '33333333-3333-3333-3333-333333333333',
      status: 'pdf_running',
      noteJson: { subjective: 'only-one-field' },
    });
    const repo = createMemoryRepo(session);
    const result = await runPdfStep({ repo, sessionId: session.id });
    assert.equal(result.status, 'failed');
    assert.equal(result.error, 'pdf_missing_note');
  });

  it('throws pdf_bad_status when not pdf_running or ready', async () => {
    const repo = createMemoryRepo(
      withSessionDefaults({
        id: '33333333-3333-3333-3333-333333333333',
        status: 'llm_running',
        noteJson: note,
      }),
    );
    await assert.rejects(
      () => runPdfStep({ repo, sessionId: '33333333-3333-3333-3333-333333333333' }),
      /pdf_bad_status:llm_running/,
    );
  });
});
