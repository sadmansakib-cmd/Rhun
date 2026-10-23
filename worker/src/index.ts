import { Env, UrlCheckRequest, UrlCheckResponse, HashCheckRequest, HashCheckResponse, ScanReason } from './types';
import { handleCors, checkIpRateLimit } from './cors';
import { resolveRedirectChain } from './redirects';
import { checkSafeBrowsing } from './services/safeBrowsing';
import { checkVirusTotalUrl, checkVirusTotalHash } from './services/virusTotal';
import { checkAbuseChUrl, checkMalwareBazaarHash } from './services/abuseCh';
import { checkDomainAgeRdap } from './services/rdap';

// In-memory cache fallback for local/test environments
const memoryCache = new Map<string, { data: any; expiry: number }>();

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { headers: corsHeaders, isAllowed } = handleCors(request, env);

    // Handle preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (!isAllowed) {
      return new Response(JSON.stringify({ error: 'Origin not allowed by CORS' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const clientIp = request.headers.get('CF-Connecting-IP') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkIpRateLimit(clientIp);
    if (rateLimit.isLimited) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please wait 1 minute.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' }
      });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/url-check' && request.method === 'POST') {
        return await handleUrlCheck(request, env, corsHeaders);
      }

      if (url.pathname === '/api/hash-check' && request.method === 'POST') {
        return await handleHashCheck(request, env, corsHeaders);
      }

      if (url.pathname === '/health') {
        return new Response(JSON.stringify({ status: 'ok', service: 'shield-proxy' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Endpoint not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: 'Internal server error', details: err.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

async function handleUrlCheck(request: Request, env: Env, corsHeaders: Headers): Promise<Response> {
  // Size limit: max 4KB body
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 4096) {
    return new Response(JSON.stringify({ error: 'Payload too large (max 4KB)' }), {
      status: 413,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const body = (await request.json().catch(() => ({ url: '' }))) as UrlCheckRequest;
  const rawUrl = (body.url || '').trim();

  if (!rawUrl || rawUrl.length > 2048) {
    return new Response(JSON.stringify({ error: 'Invalid URL (must be 1-2048 characters)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Check cache first (1 hour TTL)
  const cacheKey = `url:${rawUrl.toLowerCase()}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  // 1. Resolve redirect chain with SSRF protection
  const redirectInfo = await resolveRedirectChain(rawUrl);
  if (redirectInfo.isSsrfBlocked) {
    const ssrfReason: ScanReason = {
      code: 'SSRF_BLOCKED_DESTINATION',
      severity: 'critical',
      explanationEn: `Access blocked: Redirected to forbidden internal or private network target.`,
      explanationBn: `প্রবেশ নিষিদ্ধ: অভ্যন্তরীণ বা প্রাইভেট নেটওয়ার্ক গন্তব্যে রিডাইরেক্ট করা হয়েছে।`,
      potentialHarmEn: 'Server-Side Request Forgery attempt targeting private infrastructure.',
      potentialHarmBn: 'সার্ভারের অভ্যন্তরীণ নেটওয়ার্কে আক্রমণের চেষ্টা প্রতিরোধ করা হয়েছে।'
    };
    const ssrfResponse: UrlCheckResponse = {
      targetUrl: rawUrl,
      normalizedUrl: rawUrl,
      domain: 'blocked.internal',
      verdict: 'malware',
      riskScore: 98,
      riskLevel: 'high',
      reasons: [ssrfReason],
      sources: {
        safeBrowsing: 'clean',
        virusTotal: 'clean',
        urlHaus: 'clean',
        rdapAge: 'unsupported'
      },
      redirectChain: redirectInfo.chain,
      domainAgeDays: null,
      checkedAt: new Date().toISOString()
    };
    return new Response(JSON.stringify(ssrfResponse), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const finalUrl = redirectInfo.finalUrl;
  let parsedFinal: URL;
  try {
    parsedFinal = new URL(finalUrl);
  } catch (_e) {
    parsedFinal = new URL(rawUrl);
  }

  const domain = parsedFinal.hostname.toLowerCase();

  // 2. Parallel queries to threat intelligence providers with graceful degradation
  const [sbResult, vtResult, urlhausResult, rdapResult] = await Promise.all([
    checkSafeBrowsing(finalUrl, env.SAFE_BROWSING_KEY).catch(() => ({ status: 'unavailable' as const, threats: [], reasons: [] })),
    checkVirusTotalUrl(finalUrl, env.VT_API_KEY).catch(() => ({ status: 'unavailable' as const, positives: 0, total: 0, reasons: [] })),
    checkAbuseChUrl(finalUrl, env.ABUSECH_KEY).catch(() => ({ status: 'unavailable' as const, reasons: [] })),
    checkDomainAgeRdap(domain).catch(() => ({ status: 'unavailable' as const, domainAgeDays: null, reasons: [] }))
  ]);

  const reasons: ScanReason[] = [
    ...sbResult.reasons,
    ...vtResult.reasons,
    ...urlhausResult.reasons,
    ...rdapResult.reasons
  ];

  const hasThreat = sbResult.status === 'threat_found' || vtResult.status === 'threat_found' || urlhausResult.status === 'threat_found' || rdapResult.status === 'threat_found';

  let riskScore = 8;
  if (hasThreat) {
    riskScore = 92;
  } else if (rdapResult.domainAgeDays !== null && rdapResult.domainAgeDays < 30) {
    riskScore = 65;
  }

  const verdict = hasThreat ? 'phishing' : riskScore > 50 ? 'suspicious' : 'safe';
  const riskLevel = hasThreat ? 'high' : riskScore > 50 ? 'medium' : 'safe';

  const responsePayload: UrlCheckResponse = {
    targetUrl: rawUrl,
    normalizedUrl: finalUrl,
    domain,
    verdict,
    riskScore,
    riskLevel,
    reasons,
    sources: {
      safeBrowsing: sbResult.status,
      virusTotal: vtResult.status,
      urlHaus: urlhausResult.status,
      rdapAge: rdapResult.status
    },
    redirectChain: redirectInfo.chain,
    domainAgeDays: rdapResult.domainAgeDays,
    checkedAt: new Date().toISOString()
  };

  setCachedData(cacheKey, responsePayload, 3600);

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
  });
}

async function handleHashCheck(request: Request, env: Env, corsHeaders: Headers): Promise<Response> {
  const body = (await request.json().catch(() => ({ sha256: '' }))) as HashCheckRequest;
  const sha256 = (body.sha256 || '').trim().toLowerCase();

  // Validate SHA-256 (strictly 64 hex characters)
  if (!/^[a-f0-9]{64}$/.test(sha256)) {
    return new Response(JSON.stringify({ error: 'Invalid SHA-256 hash format (must be 64 hex characters)' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const cacheKey = `hash:${sha256}`;
  const cached = getCachedData(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'HIT' }
    });
  }

  const [vtHashResult, mbResult] = await Promise.all([
    checkVirusTotalHash(sha256, env.VT_API_KEY).catch(() => ({ status: 'unavailable' as const, positives: 0, total: 0, names: [], reasons: [] })),
    checkMalwareBazaarHash(sha256, env.ABUSECH_KEY).catch(() => ({ status: 'unavailable' as const, reasons: [], signature: undefined, fileType: undefined }))
  ]);

  const reasons: ScanReason[] = [...vtHashResult.reasons, ...mbResult.reasons];
  const hasThreat = vtHashResult.status === 'threat_found' || mbResult.status === 'threat_found';

  const responsePayload: HashCheckResponse = {
    sha256,
    fileName: body.fileName,
    verdict: hasThreat ? 'malware' : 'safe',
    riskLevel: hasThreat ? 'high' : 'safe',
    sources: {
      virusTotal: vtHashResult.status,
      malwareBazaar: mbResult.status
    },
    detections: {
      virusTotalCount: vtHashResult.positives,
      malwareBazaarFamily: mbResult.signature
    },
    reasons,
    checkedAt: new Date().toISOString()
  };

  setCachedData(cacheKey, responsePayload, 3600);

  return new Response(JSON.stringify(responsePayload), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Cache': 'MISS' }
  });
}

function getCachedData(key: string): any | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedData(key: string, data: any, ttlSeconds: number) {
  memoryCache.set(key, {
    data,
    expiry: Date.now() + ttlSeconds * 1000
  });
}
