// ============================================
// Security Utilities
// Centralized security functions for the app
// ============================================

import { NextRequest, NextResponse } from 'next/server';

// ─── Rate Limiter (in-memory, per-IP) ───
// In production: use Redis or Upstash Rate Limit
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  ip: string,
  limit: number = 30,
  windowMs: number = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }

  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }

  return { allowed: true, remaining: limit - entry.count };
}

// Clean up expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of rateLimitStore) {
      if (now > val.resetAt) rateLimitStore.delete(key);
    }
  }, 60_000);
}

// ─── Idempotency Check (in-memory) ───
// Prevents duplicate transactions from replay attacks
const processedKeys = new Map<string, { result: unknown; expiresAt: number }>();

export function checkIdempotency(key: string): unknown | null {
  const entry = processedKeys.get(key);
  if (entry && Date.now() < entry.expiresAt) {
    return entry.result;
  }
  return null;
}

export function setIdempotency(key: string, result: unknown, ttlMs: number = 300_000) {
  processedKeys.set(key, { result, expiresAt: Date.now() + ttlMs });
}

// Clean up expired idempotency keys
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, val] of processedKeys) {
      if (now > val.expiresAt) processedKeys.delete(key);
    }
  }, 60_000);
}

// ─── Cryptographic Random ───
// Use for draws, lottery, anything needing unpredictability

export function cryptoRandomInt(max: number): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] % max;
}

// Fisher-Yates shuffle using crypto random
export function cryptoShuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generate crypto-safe hex seed for audit trail
export function cryptoSeed(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ─── Input Validation ───

export function validateAmount(amount: unknown, min: number, max: number): { valid: boolean; value: number; error?: string } {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    return { valid: false, value: 0, error: 'Amount must be a number' };
  }
  if (amount <= 0) {
    return { valid: false, value: 0, error: 'Amount must be positive' };
  }
  if (!Number.isInteger(amount)) {
    return { valid: false, value: 0, error: 'Amount must be an integer (cents)' };
  }
  if (amount < min) {
    return { valid: false, value: 0, error: `Amount below minimum (${min})` };
  }
  if (amount > max) {
    return { valid: false, value: 0, error: `Amount exceeds maximum (${max})` };
  }
  return { valid: true, value: amount };
}

export function validateUserId(userId: unknown): boolean {
  return typeof userId === 'string' && userId.length > 0 && userId.length < 128 && /^[a-zA-Z0-9_-]+$/.test(userId);
}

export function sanitizeString(str: unknown, maxLen: number = 256): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/[<>&"']/g, '') // Strip HTML special chars
    .trim()
    .slice(0, maxLen);
}

// ─── API Auth Helper ───
// In production: validate JWT / session token from Supabase
// For now: check for auth header presence and basic format

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}

export function requireAuth(request: NextRequest): { authorized: boolean; userId?: string; error?: NextResponse } {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  const token = authHeader.slice(7);

  // In production: verify JWT with Supabase
  // For now: accept any non-empty bearer token and extract user from it
  // This is a placeholder - MUST be replaced with real JWT verification
  if (!token || token.length < 10) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      ),
    };
  }

  // Mock: extract user_id from token (in production: decode JWT)
  return { authorized: true, userId: 'authenticated-user' };
}

// ─── API Key Auth for TV/External APIs ───
export function requireApiKey(request: NextRequest, envKey: string): { authorized: boolean; error?: NextResponse } {
  const token = request.headers.get('x-api-key') || request.headers.get('x-tv-api-key');
  const expected = process.env[envKey];

  if (!expected) {
    // API key not configured - block all access
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Service not configured' },
        { status: 503 }
      ),
    };
  }

  if (!token || token !== expected) {
    return {
      authorized: false,
      error: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ),
    };
  }

  return { authorized: true };
}

// ─── Audit Logger ───
// In production: write to database / log aggregation service

export interface AuditEntry {
  timestamp: string;
  action: string;
  user_id?: string;
  ip?: string;
  details: Record<string, unknown>;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
}

const auditLog: AuditEntry[] = [];

export function logAudit(entry: Omit<AuditEntry, 'timestamp'>) {
  const fullEntry = { ...entry, timestamp: new Date().toISOString() };
  auditLog.push(fullEntry);

  // In production: persist to database
  if (entry.risk_level === 'high' || entry.risk_level === 'critical') {
    console.warn('[AUDIT ALERT]', JSON.stringify(fullEntry));
  }
}

export function getAuditLog(): AuditEntry[] {
  return [...auditLog];
}
