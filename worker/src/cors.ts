import { Env } from './types';

export function handleCors(request: Request, env: Env): { headers: Headers; isAllowed: boolean } {
  const origin = request.headers.get('Origin') || '';
  const allowedConfig = env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173';
  const allowedList = allowedConfig.split(',').map((o) => o.trim().toLowerCase());

  let isAllowed = false;

  if (origin) {
    const lowerOrigin = origin.toLowerCase();
    // Allow configured origins
    if (allowedList.includes(lowerOrigin)) {
      isAllowed = true;
    }
    // Allow extension origin if configured or in dev
    if (lowerOrigin.startsWith('chrome-extension://')) {
      if (!env.ALLOWED_EXTENSION_ID || lowerOrigin === `chrome-extension://${env.ALLOWED_EXTENSION_ID.toLowerCase()}`) {
        isAllowed = true;
      }
    }
    // Allow localhost/127.0.0.1 in development
    if (lowerOrigin.includes('localhost') || lowerOrigin.includes('127.0.0.1')) {
      isAllowed = true;
    }
  } else {
    // Non-browser or same-origin request
    isAllowed = true;
  }

  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', isAllowed && origin ? origin : allowedList[0] || '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-requested-with');
  headers.set('Access-Control-Max-Age', '86400');

  return { headers, isAllowed };
}

// In-memory sliding window IP rate limiter (resets on Worker restart, safe for edge instances)
const ipRequestHistory = new Map<string, number[]>();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

export function checkIpRateLimit(clientIp: string): { isLimited: boolean; remaining: number } {
  const now = Date.now();
  const timestamps = (ipRequestHistory.get(clientIp) || []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return { isLimited: true, remaining: 0 };
  }

  timestamps.push(now);
  ipRequestHistory.set(clientIp, timestamps);

  // Evict stale entries occasionally to prevent memory leak
  if (ipRequestHistory.size > 2000) {
    for (const [key, list] of ipRequestHistory.entries()) {
      if (list.every((t) => now - t >= WINDOW_MS)) {
        ipRequestHistory.delete(key);
      }
    }
  }

  return { isLimited: false, remaining: MAX_REQUESTS_PER_WINDOW - timestamps.length };
}
