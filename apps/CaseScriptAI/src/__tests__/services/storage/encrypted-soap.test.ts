import { createSoapPersistPort, purgeSessionArtifacts } from '@/services/storage/encrypted-soap';
import { createMemorySessionRepository } from '@/services/storage/session-repository';
import { setCryptoKeyProvider } from '@/services/audio/crypto-service';
import { createKeyStore, createMemorySecureStore } from '@/services/storage/key-store';

jest.mock('react-native-aes-gcm-crypto', () => ({
  __esModule: true,
  default: {
    encrypt: jest.fn(async (plain: string) => ({
      iv: 'iv',
      tag: 'tag',
      content: `enc:${plain}`,
    })),
    decrypt: jest.fn(async (cipher: string) => cipher.replace(/^enc:/, '')),
  },
}));

jest.mock('expo-file-system', () => {
  const files = new Map<string, string>();
  class File {
    uri: string;
    constructor(dirOrPath: { uri?: string } | string, name?: string) {
      if (typeof dirOrPath === 'string') {
        this.uri = dirOrPath;
      } else {
        this.uri = `${dirOrPath.uri ?? ''}/${name ?? ''}`;
      }
    }
    get exists() {
      return files.has(this.uri);
    }
    create() {}
    write(value: string) {
      files.set(this.uri, value);
    }
    async text() {
      return files.get(this.uri) ?? '';
    }
  }
  class Directory {
    uri: string;
    exists = false;
    constructor(...parts: Array<string | { uri?: string }>) {
      this.uri = parts
        .map((p) => (typeof p === 'string' ? p : (p.uri ?? '')))
        .join('/');
    }
    create() {
      this.exists = true;
    }
  }
  return {
    File,
    Directory,
    Paths: { document: 'file:///document' },
  };
});

describe('encrypted soap + purge', () => {
  beforeEach(() => {
    const keys = createKeyStore(createMemorySecureStore());
    setCryptoKeyProvider(() => keys.getOrCreateAesKey());
  });

  it('persists COMPLETE session and purges chunk artifacts', async () => {
    const sessions = createMemorySessionRepository();
    const deleted: string[] = [];
    const cleared: string[] = [];

    const port = createSoapPersistPort({
      sessions,
      now: () => 5_000,
      purge: (sessionId) =>
        purgeSessionArtifacts(sessionId, {
          listChunkPaths: async () => ['/tmp/a.wav'],
          deletePath: async (path) => {
            deleted.push(path);
            return { success: true, data: undefined };
          },
          clearSessionKeys: (id) => {
            cleared.push(id);
          },
        }),
    });

    const saved = await port.save('s1', 'S: subjective');
    expect(saved.success).toBe(true);

    const row = await sessions.getById('s1');
    expect(row.success && row.data).toMatchObject({
      id: 's1',
      status: 'complete',
      soapIv: 'iv',
      soapTag: 'tag',
    });
    expect(deleted).toEqual(['/tmp/a.wav']);
    expect(cleared).toEqual(['s1']);
  });
});
