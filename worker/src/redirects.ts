import { isSsrfBlockedHost } from './ssrf';

export interface RedirectResolutionResult {
  chain: string[];
  finalUrl: string;
  isSsrfBlocked: boolean;
  error?: string;
}

const MAX_HOPS = 5;
const TIMEOUT_MS = 3500;

/**
 * Expands redirect chains server-side with strict SSRF protection.
 * Follows HTTP redirect headers manually without downloading response bodies.
 */
export async function resolveRedirectChain(initialUrl: string): Promise<RedirectResolutionResult> {
  const chain: string[] = [initialUrl];
  let currentUrl = initialUrl;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch (_e) {
      return { chain, finalUrl: currentUrl, isSsrfBlocked: false, error: 'Malformed redirect URL' };
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { chain, finalUrl: currentUrl, isSsrfBlocked: true, error: `Blocked non-http(s) protocol '${parsed.protocol}'` };
    }

    if (isSsrfBlockedHost(parsed.hostname)) {
      return { chain, finalUrl: currentUrl, isSsrfBlocked: true, error: `Blocked SSRF target '${parsed.hostname}'` };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      // Perform a HEAD request first to inspect headers without fetching payload
      const response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'ShieldSecurityBot/1.0 (+https://shield-security.pages.dev)'
        }
      });
      clearTimeout(timeoutId);

      const status = response.status;
      const isRedirect = status >= 300 && status < 400;

      if (!isRedirect) {
        // Destination reached
        break;
      }

      const location = response.headers.get('location');
      if (!location) {
        break;
      }

      // Resolve relative redirect against currentUrl
      const nextUrl = new URL(location, currentUrl).href;
      chain.push(nextUrl);
      currentUrl = nextUrl;
    } catch (err: any) {
      // If abort or network error, stop resolving and return current chain
      return {
        chain,
        finalUrl: currentUrl,
        isSsrfBlocked: false,
        error: err.name === 'AbortError' ? 'Redirect resolution timed out' : err.message
      };
    }
  }

  return {
    chain,
    finalUrl: currentUrl,
    isSsrfBlocked: false
  };
}
