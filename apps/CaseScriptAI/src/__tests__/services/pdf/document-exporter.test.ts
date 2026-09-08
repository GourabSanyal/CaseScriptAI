const mockExistingUris = new Set<string>();

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
      return mockExistingUris.has(this.uri);
    }
    async delete() {
      mockExistingUris.delete(this.uri);
    }
    async copy(dest: { uri: string }) {
      mockExistingUris.add(dest.uri);
    }
  }

  class Directory {
    uri: string;
    exists = true;
    constructor(...parts: string[]) {
      this.uri = `file:///${parts.join('/')}`;
    }
    create() {}
  }

  return { File, Directory, Paths: { document: 'doc' } };
});

import {
  buildSoapReportHtml,
  createDocumentExporter,
} from '@/services/pdf/document-exporter';

describe('DocumentExporter', () => {
  beforeEach(() => {
    mockExistingUris.clear();
  });

  it('escapes HTML and exports a PDF path', async () => {
    const html = buildSoapReportHtml({
      soapNote: '<script>x</script>',
      transcript: 'hi',
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('SOAP Note');

    const exporter = createDocumentExporter({
      printToFile: async () => 'file:///tmp/out.pdf',
      canShare: async () => true,
      shareFile: async () => undefined,
    });

    expect(typeof exporter.exportPdf).toBe('function');
    expect(typeof exporter.sharePdf).toBe('function');
  });

  it('sharePdf fails when sharing unavailable', async () => {
    const exporter = createDocumentExporter({
      printToFile: async () => 'file:///x.pdf',
      canShare: async () => false,
    });
    const result = await exporter.sharePdf('file:///x.pdf');
    expect(result).toEqual({ success: false, error: 'Sharing is not available' });
  });

  it('exportPdf uses non-colliding file names when target already exists', async () => {
    mockExistingUris.add('file:///tmp/out.pdf'); // Source temp file exists
    mockExistingUris.add('file:///reports/soap-123.pdf'); // First copy already exists

    const exporter = createDocumentExporter({
      printToFile: async () => 'file:///tmp/out.pdf',
      reportsDir: () => ({ uri: 'file:///reports', exists: true, create: () => {} } as never),
    });

    const res = await exporter.exportPdf({
      soapNote: 'Patient is doing well.',
      fileName: 'soap-123.pdf',
    });

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toBe('file:///reports/soap-123(2).pdf');
      expect(mockExistingUris.has('file:///reports/soap-123(2).pdf')).toBe(true);
    }
  });
});

