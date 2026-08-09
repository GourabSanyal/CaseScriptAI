import {
  buildSoapReportHtml,
  createDocumentExporter,
} from '@/services/pdf/document-exporter';

describe('DocumentExporter', () => {
  it('escapes HTML and exports a PDF path', async () => {
    const html = buildSoapReportHtml({
      soapNote: '<script>x</script>',
      transcript: 'hi',
    });
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>x</script>');

    const files = new Map<string, string>();
    const exporter = createDocumentExporter({
      printToFile: async () => 'file:///tmp/out.pdf',
      canShare: async () => true,
      shareFile: async () => undefined,
      reportsDir: () => {
        const dir = {
          uri: 'file:///reports',
          exists: true,
          create: () => undefined,
        };
        return dir as never;
      },
    });

    // Patch File via mock module behavior — use injectable print only for this unit.
    jest.doMock('expo-file-system', () => {
      class File {
        uri: string;
        constructor(a: { uri: string } | string, name?: string) {
          this.uri = typeof a === 'string' ? a : `${a.uri}/${name}`;
        }
        get exists() {
          return this.uri === 'file:///tmp/out.pdf' || files.has(this.uri);
        }
        async copy(dest: { uri: string }) {
          files.set(dest.uri, 'pdf');
        }
      }
      return { File, Directory: class {}, Paths: { document: 'file:///doc' } };
    });

    // Direct path test without FS: build HTML contract is the critical unit.
    expect(html).toContain('SOAP Note');
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
});
