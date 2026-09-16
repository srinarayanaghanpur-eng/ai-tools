export default function contentDisposition(filename: string): string {
  const safe = (filename || 'download').replace(/["\r\n]/g, '_').slice(0, 180);
  const encoded = encodeURIComponent(safe).replace(/['()]/g, escape);
  return `attachment; filename="${safe}"; filename*=UTF-8''${encoded}`;
}
