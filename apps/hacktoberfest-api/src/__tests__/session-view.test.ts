import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toPublicSession } from '../http/session-view.js';
import type { DemoSession } from '../db/session-repository.js';

describe('toPublicSession', () => {
  it('exposes status and pdfUrl without transcript or note_json', () => {
    const session: DemoSession = {
      id: '55555555-5555-5555-5555-555555555555',
      status: 'ready',
      transcript: 'SECRET_TRANSCRIPT',
      noteJson: { subjective: 'SECRET_NOTE' },
      pdfPath: '/tmp/x.pdf',
      error: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const view = toPublicSession(session, 'http://localhost:3001/');
    assert.deepEqual(view, {
      id: session.id,
      status: 'ready',
      error: null,
      pdfUrl: `http://localhost:3001/sessions/${session.id}/pdf`,
    });
    assert.equal(JSON.stringify(view).includes('SECRET'), false);
  });
});
