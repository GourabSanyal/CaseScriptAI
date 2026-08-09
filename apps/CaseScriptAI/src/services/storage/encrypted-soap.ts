import { Directory, File, Paths } from 'expo-file-system';

import { decryptText, encryptText } from '@/services/audio/crypto-service';
import { appStorage } from '@/services/storage/mmkv';

import type { Result } from '@/types/result';
import type { Session, SessionRepository } from '@/types/session';

const soapDir = () => new Directory(Paths.document, 'cases', 'soap');

export type SoapFileParts = {
  path: string;
  iv: string;
  tag: string;
};

/** Encrypt SOAP note to disk; returns path + GCM metadata for the session row. */
export const saveEncryptedSoap = async (
  sessionId: string,
  soapNote: string,
): Promise<Result<SoapFileParts>> => {
  const encrypted = await encryptText(soapNote);
  if (!encrypted.success) return encrypted;

  try {
    const dir = soapDir();
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
    const file = new File(dir, `${sessionId}.soap.enc`);
    file.create({ intermediates: true, overwrite: true });
    file.write(encrypted.data.ciphertext);
    return {
      success: true,
      data: { path: file.uri, iv: encrypted.data.iv, tag: encrypted.data.tag },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to write encrypted SOAP',
    };
  }
};

export const loadEncryptedSoap = async (session: Session): Promise<Result<string>> => {
  if (!session.soapPath || !session.soapIv || !session.soapTag) {
    return { success: false, error: 'Session has no encrypted SOAP' };
  }
  try {
    const file = new File(session.soapPath);
    if (!file.exists) return { success: false, error: 'SOAP file missing' };
    const ciphertext = await file.text();
    return decryptText(ciphertext, session.soapIv, session.soapTag);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to read SOAP',
    };
  }
};

const audioKey = (sessionId: string) => `pipeline-audio-chunks:${sessionId}`;
const transcriptKey = (sessionId: string) => `pipeline-transcript:${sessionId}`;
const soapMmKvKey = (sessionId: string) => `pipeline-soap:${sessionId}`;

export type PurgeDeps = {
  deletePath: (path: string) => Promise<Result<void>>;
  listChunkPaths: (sessionId: string) => Promise<string[]>;
  clearSessionKeys?: (sessionId: string) => void;
};

export const purgeSessionArtifacts = async (
  sessionId: string,
  deps: PurgeDeps,
): Promise<Result<void>> => {
  try {
    const paths = await deps.listChunkPaths(sessionId);
    for (const path of paths) {
      const deleted = await deps.deletePath(path);
      if (!deleted.success) return deleted;
    }
    if (deps.clearSessionKeys) {
      deps.clearSessionKeys(sessionId);
    } else {
      appStorage.delete(audioKey(sessionId));
      appStorage.delete(transcriptKey(sessionId));
      appStorage.delete(soapMmKvKey(sessionId));
    }
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Purge failed',
    };
  }
};

/** Pipeline SoapPersistPort: encrypt file + upsert COMPLETE session + purge chunks. */
export const createSoapPersistPort = (args: {
  sessions: SessionRepository;
  now?: () => number;
  purge: (sessionId: string) => Promise<Result<void>>;
}) => ({
  save: async (sessionId: string, soapNote: string): Promise<Result<void>> => {
    const saved = await saveEncryptedSoap(sessionId, soapNote);
    if (!saved.success) return saved;

    const now = (args.now ?? Date.now)();
    const existing = await args.sessions.getById(sessionId);
    const base = existing.success && existing.data ? existing.data : null;

    const upserted = await args.sessions.upsert({
      id: sessionId,
      status: 'complete',
      createdAt: base?.createdAt ?? now,
      updatedAt: now,
      completedAt: now,
      durationMs: base?.durationMs,
      patientName: base?.patientName,
      patientId: base?.patientId,
      notes: base?.notes,
      soapPath: saved.data.path,
      soapIv: saved.data.iv,
      soapTag: saved.data.tag,
      transcriptPath: base?.transcriptPath,
    });
    if (!upserted.success) return upserted;

    return args.purge(sessionId);
  },
});
