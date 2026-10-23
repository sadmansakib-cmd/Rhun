/**
 * URL parsing, validation and canonical normalization.
 * Strictly rejects non-http(s) schemes.
 */

export interface ParsedUrl {
  raw: string;
  normalized: string;
  protocol: 'http:' | 'https:';
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  username?: string;
  password?: string;
  hasUserInfo: boolean;
  subdomains: string[];
  mainDomain: string; // e.g. "example.com" or "sub.example.com.bd"
  tld: string;
  isIpv4: boolean;
  isIpv6: boolean;
  isPunycode: boolean;
}

const FORBIDDEN_SCHEMES = [
  'javascript:',
  'data:',
  'file:',
  'blob:',
  'about:',
  'vbscript:',
  'chrome:',
  'chrome-extension:',
  'filesystem:',
  'ftp:',
  'intent:'
];

const COMMON_TWO_PART_TLDS = new Set([
  'co.uk',
  'com.bd',
  'gov.bd',
  'edu.bd',
  'org.bd',
  'ac.bd',
  'com.au',
  'co.nz',
  'co.jp',
  'com.br',
  'com.sg',
  'co.in',
  'com.pk'
]);

/**
 * Validates and parses raw input into a structured ParsedUrl object.
 * Throws an Error with a descriptive message if the URL is invalid or uses an unsupported scheme.
 */
export function parseAndNormalizeUrl(rawInput: string): ParsedUrl {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('URL cannot be empty');
  }

  const lowerTrimmed = trimmed.toLowerCase();
  for (const scheme of FORBIDDEN_SCHEMES) {
    if (lowerTrimmed.startsWith(scheme)) {
      throw new Error(`Rejected non-http(s) scheme: '${scheme.replace(':', '')}' is blocked for security`);
    }
  }

  // Prepend https:// if protocol is omitted
  let candidate = trimmed;
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch (_e) {
    throw new Error(`Malformed URL syntax: '${rawInput}'`);
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`Only HTTP and HTTPS protocols are supported, received: '${parsed.protocol}'`);
  }

  const protocol = parsed.protocol as 'http:' | 'https:';
  const hostname = parsed.hostname.toLowerCase();
  const hasUserInfo = !!(parsed.username || parsed.password);

  // Check IPv4
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
  // Check IPv6 (wrapped in brackets or raw hex colons)
  const isIpv6 = hostname.includes(':') || /^\[[a-f0-9:]+\]$/i.test(hostname);
  // Check punycode
  const isPunycode = hostname.includes('xn--');

  // Parse TLD and subdomains
  const { tld, mainDomain, subdomains } = extractDomainParts(hostname, isIpv4, isIpv6);

  // Canonical normalization
  const portPart = parsed.port && !(protocol === 'http:' && parsed.port === '80') && !(protocol === 'https:' && parsed.port === '443')
    ? `:${parsed.port}`
    : '';

  const normalized = `${protocol}//${hostname}${portPart}${parsed.pathname || '/'}${parsed.search}`;

  return {
    raw: rawInput,
    normalized,
    protocol,
    hostname,
    port: parsed.port,
    pathname: parsed.pathname || '/',
    search: parsed.search || '',
    hash: parsed.hash || '',
    username: parsed.username || undefined,
    password: parsed.password || undefined,
    hasUserInfo,
    subdomains,
    mainDomain,
    tld,
    isIpv4,
    isIpv6,
    isPunycode
  };
}

function extractDomainParts(
  hostname: string,
  isIpv4: boolean,
  isIpv6: boolean
): { tld: string; mainDomain: string; subdomains: string[] } {
  if (isIpv4 || isIpv6) {
    return { tld: '', mainDomain: hostname, subdomains: [] };
  }

  const parts = hostname.split('.');
  if (parts.length <= 1) {
    return { tld: '', mainDomain: hostname, subdomains: [] };
  }

  // Check two-part TLD (e.g. "com.bd")
  if (parts.length >= 3) {
    const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
    if (COMMON_TWO_PART_TLDS.has(lastTwo)) {
      const tld = lastTwo;
      const domainName = parts[parts.length - 3];
      const mainDomain = `${domainName}.${tld}`;
      const subdomains = parts.slice(0, parts.length - 3);
      return { tld, mainDomain, subdomains };
    }
  }

  const tld = parts[parts.length - 1];
  const domainName = parts[parts.length - 2];
  const mainDomain = `${domainName}.${tld}`;
  const subdomains = parts.slice(0, parts.length - 2);

  return { tld, mainDomain, subdomains };
}
