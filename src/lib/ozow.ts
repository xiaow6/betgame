import { createHash } from 'crypto';

// ─── Ozow Configuration ───

export function getOzowConfig() {
  const siteCode = process.env.OZOW_SITE_CODE;
  const privateKey = process.env.OZOW_PRIVATE_KEY;
  const apiKey = process.env.OZOW_API_KEY;
  const isTest = process.env.OZOW_IS_TEST !== 'false'; // default to test mode

  if (!siteCode || !privateKey || !apiKey) {
    throw new Error('Missing Ozow configuration: OZOW_SITE_CODE, OZOW_PRIVATE_KEY, OZOW_API_KEY');
  }

  return { siteCode, privateKey, apiKey, isTest };
}

// ─── Hash Generation for Payment Request ───
// Concatenation order: SiteCode, CountryCode, CurrencyCode, Amount,
// TransactionReference, BankReference, CancelUrl, ErrorUrl, SuccessUrl,
// NotifyUrl, IsTest, then PrivateKey
// Lowercase the entire string, then SHA512 hash

export function generateRequestHash(params: {
  siteCode: string;
  countryCode: string;
  currencyCode: string;
  amount: string;
  transactionReference: string;
  bankReference: string;
  cancelUrl: string;
  errorUrl: string;
  successUrl: string;
  notifyUrl: string;
  isTest: boolean;
  privateKey: string;
}): string {
  const concatenated = [
    params.siteCode,
    params.countryCode,
    params.currencyCode,
    params.amount,
    params.transactionReference,
    params.bankReference,
    params.cancelUrl,
    params.errorUrl,
    params.successUrl,
    params.notifyUrl,
    params.isTest.toString(),
    params.privateKey,
  ].join('');

  return createHash('sha512')
    .update(concatenated.toLowerCase())
    .digest('hex');
}

// ─── Hash Verification for Notification Response ───
// Concatenation order (excluding Hash field): SiteCode, TransactionId,
// TransactionReference, Amount, Status, Optional1-5, CurrencyCode,
// IsTest, StatusMessage, then PrivateKey

export function verifyNotificationHash(params: {
  siteCode: string;
  transactionId: string;
  transactionReference: string;
  amount: string;
  status: string;
  optional1?: string;
  optional2?: string;
  optional3?: string;
  optional4?: string;
  optional5?: string;
  currencyCode: string;
  isTest: string;
  statusMessage: string;
  privateKey: string;
  receivedHash: string;
}): boolean {
  const concatenated = [
    params.siteCode,
    params.transactionId,
    params.transactionReference,
    params.amount,
    params.status,
    params.optional1 || '',
    params.optional2 || '',
    params.optional3 || '',
    params.optional4 || '',
    params.optional5 || '',
    params.currencyCode,
    params.isTest,
    params.statusMessage,
    params.privateKey,
  ].join('');

  const computed = createHash('sha512')
    .update(concatenated.toLowerCase())
    .digest('hex');

  return computed === params.receivedHash.toLowerCase();
}

// ─── Ozow Payment Statuses ───
export type OzowStatus = 'Complete' | 'Cancelled' | 'Error' | 'Abandoned' | 'PendingInvestigation' | 'Pending';

export function isSuccessStatus(status: string): boolean {
  return status === 'Complete';
}

export function isFinalStatus(status: string): boolean {
  return ['Complete', 'Cancelled', 'Error', 'Abandoned'].includes(status);
}

// ─── API URLs ───
export const OZOW_API_URL = 'https://api.ozow.com';
export const OZOW_PAY_URL = 'https://pay.ozow.com';
