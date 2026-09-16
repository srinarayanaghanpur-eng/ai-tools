import dns from 'node:dns/promises';
import net from 'node:net';

/** SSRF guard: block private/loopback/link-local IPs for any server-side fetch of user-supplied URLs. */
export async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http(s) URLs allowed');
  if (!u.hostname || u.username || u.password) throw new Error('Invalid URL');
  // block obvious local names
  const host = u.hostname.toLowerCase();
  if (['localhost', 'metadata.google.internal'].includes(host) || host.endsWith('.internal') || host.endsWith('.local')) {
    throw new Error('URL host blocked');
  }
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('URL resolves to private address');
    return u;
  }
  const addrs = await dns.lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new Error('DNS lookup failed');
  for (const a of addrs) {
    if (isPrivateIp(a.address)) throw new Error('URL resolves to private address');
  }
  return u;
}

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return (
      a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0
    );
  }
  // IPv6: loopback, link-local, unique-local
  const low = ip.toLowerCase();
  return low === '::1' || low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd') || low === '::';
}
