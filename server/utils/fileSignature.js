// Verifies a file's actual content (magic bytes) rather than trusting the
// client-supplied extension/MIME type, which are trivially spoofable.
// No external dependency — just the handful of signatures this app accepts.

const SIGNATURES = [
  { mime: 'image/jpeg', check: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: 'image/png', check: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a },
  { mime: 'image/gif', check: (b) => b.length >= 6 && b.toString('ascii', 0, 6) === 'GIF87a' || b.length >= 6 && b.toString('ascii', 0, 6) === 'GIF89a' },
  {
    mime: 'image/webp',
    check: (b) => b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP',
  },
  { mime: 'application/pdf', check: (b) => b.length >= 4 && b.toString('ascii', 0, 4) === '%PDF' },
];

/**
 * @param {Buffer} buffer - the file's actual bytes (from multer memoryStorage)
 * @returns {boolean} true if the buffer's content matches ANY of the allowed
 *   signatures above (jpeg/png/gif/webp/pdf) — independent of whatever
 *   extension or Content-Type header the client claimed.
 */
function hasAllowedFileSignature(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return false;
  return SIGNATURES.some((sig) => {
    try {
      return sig.check(buffer);
    } catch {
      return false;
    }
  });
}

module.exports = { hasAllowedFileSignature };
