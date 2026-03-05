import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Security Middleware
// Runs on every request matching the config
// ============================================

// In-memory rate limit (per-IP, for API routes)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const API_RATE_LIMIT = 60;       // requests per window
const API_RATE_WINDOW = 60_000;  // 1 minute

function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + API_RATE_WINDOW });
    return { allowed: true, remaining: API_RATE_LIMIT - 1 };
  }

  entry.count++;
  if (entry.count > API_RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: API_RATE_LIMIT - entry.count };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '0.0.0.0';

  // ─── Security Headers (all responses) ───
  const response = NextResponse.next();

  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  // Prevent MIME sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy - disable unnecessary browser features
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(self)');
  // Strict Transport Security (HTTPS only)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // Content Security Policy
  response.headers.set('Content-Security-Policy', [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js needs these
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '));

  // ─── Rate Limiting (API routes only) ───
  if (pathname.startsWith('/api/')) {
    const { allowed, remaining } = checkRateLimit(ip);

    response.headers.set('X-RateLimit-Limit', API_RATE_LIMIT.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());

    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Limit': API_RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    // ─── API Auth Check ───
    // Payment & TV APIs require authentication
    if (pathname.startsWith('/api/payment/')) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    if (pathname.startsWith('/api/tv/')) {
      const apiKey = request.headers.get('x-tv-api-key');
      const expectedKey = process.env.TV_API_KEY;
      if (!expectedKey || !apiKey || apiKey !== expectedKey) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }
  }

  // ─── Admin Route Protection ───
  if (pathname.startsWith('/admin')) {
    // In production: verify admin JWT/session
    // For now: check for admin cookie/header
    const adminToken = request.cookies.get('admin_token')?.value;
    const isDevMode = process.env.NODE_ENV === 'development';

    if (!isDevMode && !adminToken) {
      return NextResponse.redirect(new URL('/auth', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and _next internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
