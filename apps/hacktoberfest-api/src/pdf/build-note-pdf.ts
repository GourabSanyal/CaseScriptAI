import type { StructuredNote } from '../domain/structured-note.js';
import { STRUCTURED_NOTE_KEYS } from '../domain/structured-note.js';

const escapePdf = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

const wrapLine = (text: string, width: number): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = words[0];
  for (const word of words.slice(1)) {
    if (`${current} ${word}`.length <= width) {
      current = `${current} ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
};

/** Minimal single-page PDF from a structured SOAP note (no external PDF libs). */
export const buildNotePdf = (note: StructuredNote): Buffer => {
  const lines: string[] = [
    'CaseScriptAI — Session Note (demo)',
    'Synthetic data only — not for clinical use.',
    '',
  ];

  for (const key of STRUCTURED_NOTE_KEYS) {
    lines.push(key.toUpperCase());
    for (const wrapped of wrapLine(note[key], 86)) {
      lines.push(wrapped);
    }
    lines.push('');
  }

  const contentOps = [
    'BT',
    '/F1 11 Tf',
    '50 780 Td',
    '14 TL',
    ...lines.map((line, index) => {
      const escaped = escapePdf(line);
      return index === 0 ? `(${escaped}) Tj` : `T* (${escaped}) Tj`;
    }),
    'ET',
  ].join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n');
  objects.push('2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n');
  objects.push(
    '3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n',
  );
  objects.push(
    `4 0 obj<< /Length ${Buffer.byteLength(contentOps, 'utf8')} >>stream\n${contentOps}\nendstream\nendobj\n`,
  );
  objects.push('5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n');

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += obj;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdf, 'utf8');
};
