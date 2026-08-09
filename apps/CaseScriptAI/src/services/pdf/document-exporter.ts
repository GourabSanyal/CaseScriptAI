import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Directory, File, Paths } from 'expo-file-system';

import type { Result } from '@/types/result';

export type DocumentExporterDeps = {
  printToFile: (html: string) => Promise<string>;
  shareFile?: (uri: string) => Promise<void>;
  canShare?: () => Promise<boolean>;
  reportsDir?: () => Directory;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const buildSoapReportHtml = (args: {
  soapNote: string;
  transcript?: string;
  title?: string;
}): string => {
  const title = escapeHtml(args.title ?? 'CaseScriptAI Clinical Note');
  const soap = escapeHtml(args.soapNote || 'No SOAP note.');
  const transcript = escapeHtml(args.transcript || '');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
body{font-family:Helvetica,sans-serif;padding:40px;color:#1c1c19}
h1{color:#3a6750;border-bottom:2px solid #3a6750;padding-bottom:8px}
h2{margin-top:28px;color:#414943}
.content{background:#f0ede9;padding:14px;border-radius:8px;white-space:pre-wrap}
.footer{margin-top:40px;font-size:12px;color:#717973;text-align:center}
</style></head><body>
<h1>${title}</h1>
${transcript ? `<h2>Transcript</h2><div class="content">${transcript}</div>` : ''}
<h2>SOAP Note</h2><div class="content">${soap}</div>
<div class="footer">Generated on-device by CaseScriptAI</div>
</body></html>`;
};

export const createDocumentExporter = (deps: DocumentExporterDeps) => {
  const reportsDir =
    deps.reportsDir ?? (() => new Directory(Paths.document, 'cases', 'reports'));

  const exportPdf = async (args: {
    soapNote: string;
    transcript?: string;
    fileName?: string;
  }): Promise<Result<string>> => {
    try {
      const html = buildSoapReportHtml(args);
      const tempUri = await deps.printToFile(html);
      const dir = reportsDir();
      if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
      const name = args.fileName ?? `soap-${Date.now()}.pdf`;
      const dest = new File(dir, name);
      const source = new File(tempUri);
      if (!source.exists) return { success: false, error: 'PDF temp file missing' };
      await source.copy(dest);
      return { success: true, data: dest.uri };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF export failed',
      };
    }
  };

  const sharePdf = async (uri: string): Promise<Result<void>> => {
    try {
      if (deps.canShare && !(await deps.canShare())) {
        return { success: false, error: 'Sharing is not available' };
      }
      if (!deps.shareFile) return { success: false, error: 'Share not configured' };
      await deps.shareFile(uri);
      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Share failed',
      };
    }
  };

  return { exportPdf, sharePdf, buildSoapReportHtml };
};

export const documentExporter = createDocumentExporter({
  printToFile: async (html) => {
    const { uri } = await Print.printToFileAsync({ html });
    return uri;
  },
  canShare: () => Sharing.isAvailableAsync(),
  shareFile: (uri) =>
    Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Share clinical note PDF',
    }),
});
