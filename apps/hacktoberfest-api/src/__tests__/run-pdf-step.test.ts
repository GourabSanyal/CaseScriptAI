import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import type { DemoSession, SessionRepository } from '../db/session-repository.js';
import { assertTransition, type SessionStatus } from '../domain/session-status.js';
import {
  pdfPathForSession,
  runPdfStep,
} from '../pdf/run-pdf-step.js';

const createMemoryRepo = (initial: DemoSession): SessionRepository => {
  let session = { ...initial };
  return {
    createSession: async () => session,
    getById: async (id) => (id === session.id ? { ...session } : null),
    updateStatus: async (id, next, patch = {}) => {
      if (id !== session.id) throw new Error(`session_not_found:${id}`);
      assertTransition(session.status, next);
      session = {
        ...session,
        status: next,
        transcript:
          patch.transcript === undefined ? session.transcript : patch.transcript,
        noteJson: patch.noteJson === undefined ? session.noteJson : patch.noteJson,
        pdfPath: patch.pdfPath === undefined ? session.pdfPath : patch.pdfPath,
        error: patch.error === undefined ? session.error : patch.error,
        updatedAt: new Date(),
      };
      return { ...session };
    },
  };
};

const note = {
  subjective: 'Sleep lighter this week with work stress.',
  objective: 'Engaged; affect congruent.',
  assessment: 'Situational stress with sleep disruption.',
  plan: 'Breathing three evenings; phone-free hour.',
};

const pdfSession = (status: SessionStatus, pdfPath: string | null = null): DemoSession => ({
  id: '33333333-3333-3333-3333-333333333333',
  status,
  transcript: 'synthetic',
  noteJson: note,
  pdfPath,
  error: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('runPdfStep', () => {
  it('writes PDF and marks ready from pdf_running', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'pdf-'));
    const repo = createMemoryRepo(pdfSession('pdf_running'));

    try {
      const result = await runPdfStep({
        repo,
        sessionId: '33333333-3333-3333-3333-333333333333',
        pdfDir: dir,
      });
      assert.equal(result.status, 'ready');
      assert.ok(result.pdfPath);
      assert.equal(result.pdfPath, pdfPathForSession(result.id, dir));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('is idempotent when ready and file exists; regenerates when missing', async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'pdf-'));
    const id = '33333333-3333-3333-3333-333333333333';
    const filePath = pdfPathForSession(id, dir);
    const repo = createMemoryRepo(pdfSession('ready', filePath));

    try {
      await writeFile(filePath, Buffer.from('%PDF-1.4 existing'));
      const first = await runPdfStep({ repo, sessionId: id, pdfDir: dir });
      assert.equal(first.status, 'ready');

      await rm(filePath, { force: true });
      const second = await runPdfStep({ repo, sessionId: id, pdfDir: dir });
      assert.equal(second.status, 'ready');

      const { readFile } = await import('node:fs/promises');
      const bytes = await readFile(filePath);
      assert.ok(bytes.length > 20);
      assert.equal(bytes.subarray(0, 5).toString('utf8'), '%PDF-');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
