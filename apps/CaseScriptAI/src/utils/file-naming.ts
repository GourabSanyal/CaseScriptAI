import { File, type Directory } from 'expo-file-system';

/**
 * Splits a filename into base name and extension (including the dot).
 * e.g. "abc.mp3" -> { base: "abc", ext: ".mp3" }
 * e.g. "archive.tar.gz" -> { base: "archive.tar", ext: ".gz" }
 * e.g. "README" -> { base: "README", ext: "" }
 */
export const splitFileName = (fileName: string): { base: string; ext: string } => {
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex <= 0) {
    return { base: fileName, ext: '' };
  }
  return {
    base: fileName.slice(0, lastDotIndex),
    ext: fileName.slice(lastDotIndex),
  };
};

/**
 * Resolves a non-colliding File instance within the target directory.
 * If "abc.mp3" exists, tries "abc(2).mp3", "abc(3).mp3", etc.
 */
export const getNonCollidingFile = (dir: Directory, fileName: string): File => {
  const initialFile = new File(dir, fileName);
  if (!initialFile.exists) {
    return initialFile;
  }

  const { base, ext } = splitFileName(fileName);
  const match = base.match(/^(.*?)\((\d+)\)$/);
  let cleanBase = base;
  let counter = 2;

  if (match && match[1] !== undefined && match[2] !== undefined) {
    cleanBase = match[1];
    counter = parseInt(match[2], 10) + 1;
  }

  while (true) {
    const candidateName = `${cleanBase}(${counter})${ext}`;
    const candidateFile = new File(dir, candidateName);
    if (!candidateFile.exists) {
      return candidateFile;
    }
    counter += 1;
  }
};

/**
 * Convenience helper returning just the non-colliding file name.
 */
export const getNonCollidingFileName = (dir: Directory, fileName: string): string => {
  return getNonCollidingFile(dir, fileName).name;
};
