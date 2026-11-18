/**
 * Minimal multipart/form-data parser for a single file field named `audio`.
 * Enough for the H9.1 demo upload — not a general MIME library.
 */
export const extractMultipartAudio = (
  body: Buffer,
  contentType: string,
): Buffer | null => {
  const match = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType);
  const boundary = (match?.[1] ?? match?.[2] ?? '').trim();
  if (!boundary) return null;

  const delim = Buffer.from(`--${boundary}`);
  let start = body.indexOf(delim);
  if (start < 0) return null;
  start += delim.length;

  while (start < body.length) {
    if (body[start] === 0x2d && body[start + 1] === 0x2d) break; // --
    if (body[start] === 0x0d && body[start + 1] === 0x0a) start += 2;

    const headerEnd = body.indexOf('\r\n\r\n', start);
    if (headerEnd < 0) break;
    const headers = body.subarray(start, headerEnd).toString('utf8');
    const next = body.indexOf(delim, headerEnd + 4);
    if (next < 0) break;

    let partEnd = next;
    if (body[partEnd - 2] === 0x0d && body[partEnd - 1] === 0x0a) {
      partEnd -= 2;
    }
    const payload = body.subarray(headerEnd + 4, partEnd);
    start = next + delim.length;

    if (/name="audio"/i.test(headers) && /filename=/i.test(headers)) {
      return Buffer.from(payload);
    }
  }

  return null;
};
