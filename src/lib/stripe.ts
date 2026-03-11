import Stripe from 'stripe';

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }
    _stripe = new Stripe(secretKey);
  }
  return _stripe;
}

// Convert cents (ZAR) to Stripe smallest unit (also cents for ZAR)
export function centsToStripeAmount(cents: number): number {
  return cents; // ZAR uses cents as smallest unit, same as our internal representation
}
