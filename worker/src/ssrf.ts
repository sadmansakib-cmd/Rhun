/**
 * Server-Side Request Forgery (SSRF) Protection.
 * Strictly blocks private, loopback, link-local, multicast, and cloud metadata addresses.
 */

// Private & special IPv4 ranges
const BLOCKED_IPV4_PREFIXES = [
  '0.', // Current network
  '10.', // Private Class A
  '127.', // Loopback
  '169.254.', // Link-local / AWS / GCP / Azure metadata (169.254.169.254)
  '192.168.', // Private Class C
  '192.0.2.', // TEST-NET-1
  '198.51.100.', // TEST-NET-2
  '203.0.113.' // TEST-NET-3
];

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'metadata.google.internal',
  'instance-data',
  'local',
  'internal',
  'lan'
]);

/**
 * Checks whether an IPv4 address is in a blocked/private range (including 172.16.0.0/12).
 */
function isBlockedIpv4(ip: string): boolean {
  for (const prefix of BLOCKED_IPV4_PREFIXES) {
    if (ip.startsWith(prefix)) {
      return true;
    }
  }

  // Check 172.16.0.0 - 172.31.255.255 (172.16.0.0/12)
  if (ip.startsWith('172.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      if (second >= 16 && second <= 31) {
        return true;
      }
    }
  }

  // Check 100.64.0.0/10 (Carrier Grade NAT)
  if (ip.startsWith('100.')) {
    const parts = ip.split('.');
    if (parts.length >= 2) {
      const second = parseInt(parts[1], 10);
      if (second >= 64 && second <= 127) {
        return true;
      }
    }
  }

  // Check Multicast / Reserved (>= 224.0.0.0)
  const first = parseInt(ip.split('.')[0], 10);
  if (first >= 224) {
    return true;
  }

  return false;
}

/**
 * Checks whether an IPv6 address is in a blocked/private/loopback range.
 */
function isBlockedIpv6(ip: string): boolean {
  const clean = ip.replace(/^\[|\]$/g, '').toLowerCase();
  if (clean === '::1' || clean === '::' || clean.startsWith('fe80:') || clean.startsWith('fc00:') || clean.startsWith('fd00:') || clean.startsWith('::ffff:')) {
    return true;
  }
  return false;
}

/**
 * Validates a hostname or IP address against SSRF rules.
 * Returns true if blocked, false if safe to contact.
 */
export function isSsrfBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().trim();

  // Strip brackets if IPv6
  const unbracketed = host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan')) {
    return true;
  }

  // IPv4 check
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return isBlockedIpv4(host);
  }

  // IPv6 check
  if (unbracketed.includes(':')) {
    return isBlockedIpv6(unbracketed);
  }

  return false;
}
