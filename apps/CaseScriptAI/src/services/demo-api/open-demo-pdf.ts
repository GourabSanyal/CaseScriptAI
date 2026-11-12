import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { Result } from '@/types/result';

type OpenPdfDeps = {
  fetchImpl?: typeof fetch;
  shareAsync?: typeof Sharing.shareAsync;
  isAvailableAsync?: typeof Sharing.isAvailableAsync;
};

/**
 * Download demo PDF bytes to app storage and open the share sheet (H8.7).
 * Never logs the URL body or note contents.
 */
export const openDemoPdf = async (
  pdfUrl: string,
  sessionId: string,
  deps: OpenPdfDeps = {},
): Promise<Result<string>> => {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const shareAsync = deps.shareAsync ?? Sharing.shareAsync;
  const isAvailableAsync = deps.isAvailableAsync ?? Sharing.isAvailableAsync;

  try {
    const res = await fetchImpl(pdfUrl);
    if (!res.ok) {
      return { success: false, error: 'pdf_download_failed' };
    }
    const buffer = await res.arrayBuffer();
    const dir = new Directory(Paths.cache, 'demo-notes');
    if (!dir.exists) {
      dir.create({ intermediates: true, idempotent: true });
    }
    const file = new File(dir, `session-${sessionId}.pdf`);
    file.write(new Uint8Array(buffer));

    const canShare = await isAvailableAsync();
    if (canShare) {
      await shareAsync(file.uri, {
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
        dialogTitle: 'Session note PDF',
      });
    }
    return { success: true, data: file.uri };
  } catch {
    return { success: false, error: 'pdf_open_failed' };
  }
};
