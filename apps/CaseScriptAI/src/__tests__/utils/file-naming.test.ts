import {
  getNonCollidingFile,
  getNonCollidingFileName,
  splitFileName,
} from '@/utils/file-naming';

const mockExistingFiles = new Set<string>();

jest.mock('expo-file-system', () => {
  class File {
    uri: string;
    name: string;
    constructor(dirOrPath: { uri?: string } | string, fileName?: string) {
      if (typeof dirOrPath === 'string') {
        this.uri = dirOrPath;
        this.name = dirOrPath.split('/').pop() ?? '';
      } else {
        const dirUri = dirOrPath.uri ?? '';
        this.name = fileName ?? '';
        this.uri = `${dirUri}/${this.name}`;
      }
    }
    get exists() {
      return mockExistingFiles.has(this.name);
    }
  }

  class Directory {
    uri: string;
    exists = true;
    constructor(uri = 'file:///test-dir') {
      this.uri = uri;
    }
  }

  return { File, Directory };
});

describe('file-naming', () => {
  beforeEach(() => {
    mockExistingFiles.clear();
  });

  describe('splitFileName', () => {
    it('splits standard files into base and extension', () => {
      expect(splitFileName('abc.mp3')).toEqual({ base: 'abc', ext: '.mp3' });
      expect(splitFileName('report.pdf')).toEqual({ base: 'report', ext: '.pdf' });
      expect(splitFileName('multi.dot.name.wav')).toEqual({ base: 'multi.dot.name', ext: '.wav' });
    });

    it('handles files with no extension', () => {
      expect(splitFileName('README')).toEqual({ base: 'README', ext: '' });
      expect(splitFileName('.gitignore')).toEqual({ base: '.gitignore', ext: '' });
    });
  });

  describe('getNonCollidingFile & getNonCollidingFileName', () => {
    const dir = { uri: 'file:///reports' } as never;

    it('returns original name when no collision exists', () => {
      const fileName = getNonCollidingFileName(dir, 'abc.mp3');
      expect(fileName).toBe('abc.mp3');
    });

    it('appends (2) when original name exists', () => {
      mockExistingFiles.add('abc.mp3');
      const fileName = getNonCollidingFileName(dir, 'abc.mp3');
      expect(fileName).toBe('abc(2).mp3');
    });

    it('increments sequentially to (3), (4) when multiple collisions exist', () => {
      mockExistingFiles.add('abc.mp3');
      mockExistingFiles.add('abc(2).mp3');
      const file3 = getNonCollidingFileName(dir, 'abc.mp3');
      expect(file3).toBe('abc(3).mp3');

      mockExistingFiles.add('abc(3).mp3');
      const file4 = getNonCollidingFileName(dir, 'abc.mp3');
      expect(file4).toBe('abc(4).mp3');
    });

    it('handles incrementing if input already has a number suffix', () => {
      mockExistingFiles.add('abc(2).mp3');
      const next = getNonCollidingFileName(dir, 'abc(2).mp3');
      expect(next).toBe('abc(3).mp3');
    });

    it('works for files without extensions', () => {
      mockExistingFiles.add('notes');
      expect(getNonCollidingFileName(dir, 'notes')).toBe('notes(2)');

      mockExistingFiles.add('notes(2)');
      expect(getNonCollidingFileName(dir, 'notes')).toBe('notes(3)');
    });

    it('returns a File instance pointing to the non-colliding location', () => {
      mockExistingFiles.add('soap-123.pdf');
      const file = getNonCollidingFile(dir, 'soap-123.pdf');
      expect(file.name).toBe('soap-123(2).pdf');
      expect(file.uri).toBe('file:///reports/soap-123(2).pdf');
    });
  });
});
