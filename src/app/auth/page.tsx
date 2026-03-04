'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Phone, ArrowRight, Gift } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { mockUser } from '@/lib/mock-data';

export default function AuthPage() {
  const router = useRouter();
  const { login } = useStore();
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [referralCode, setReferralCode] = useState('');

  const handleSendOtp = () => {
    if (phone.length >= 9) {
      setStep('otp');
    }
  };

  const handleVerifyOtp = () => {
    if (otp.length === 4) {
      setStep('name');
    }
  };

  const handleComplete = () => {
    // Mock login - will be replaced with Supabase
    login({
      ...mockUser,
      phone: `+27${phone}`,
      display_name: name || 'Player',
    });
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#0f0f23] flex flex-col">
      {/* Hero */}
      <div className="pt-16 pb-8 px-6 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/20">
          <span className="text-3xl font-black text-white">BG</span>
        </div>
        <h1 className="text-2xl font-bold">Welcome to BetGame</h1>
        <p className="text-gray-400 text-sm mt-2">Sports betting & quiz games</p>
      </div>

      {/* Bonus Banner */}
      <div className="mx-6 mb-6 bg-gradient-to-r from-yellow-600/20 to-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center gap-3">
        <Gift size={20} className="text-yellow-400 shrink-0" />
        <p className="text-sm text-yellow-200">
          Sign up now & get <span className="font-bold text-yellow-400">R5 FREE</span> bet!
        </p>
      </div>

      {/* Forms */}
      <div className="flex-1 px-6">
        {step === 'phone' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Phone Number</label>
              <div className="flex items-center bg-[#1a1a2e] rounded-xl overflow-hidden">
                <span className="px-4 text-gray-400 border-r border-gray-700">+27</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="81 234 5678"
                  className="flex-1 bg-transparent px-4 py-4 text-white outline-none text-lg"
                  autoFocus
                />
                <Phone size={18} className="text-gray-500 mr-4" />
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Referral Code (optional)</label>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="e.g. BG-ABC123"
                className="w-full bg-[#1a1a2e] rounded-xl px-4 py-4 text-white outline-none"
              />
            </div>

            <button
              onClick={handleSendOtp}
              disabled={phone.length < 9}
              className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 ${
                phone.length >= 9
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              Continue <ArrowRight size={18} />
            </button>
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 text-center">
              Enter the 4-digit code sent to +27 {phone}
            </p>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="0000"
              className="w-full bg-[#1a1a2e] rounded-xl px-4 py-5 text-white text-center text-3xl tracking-[1em] outline-none font-bold"
              autoFocus
            />
            <button
              onClick={handleVerifyOtp}
              disabled={otp.length < 4}
              className={`w-full py-4 rounded-2xl font-bold ${
                otp.length === 4
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-700 text-gray-500'
              }`}
            >
              Verify
            </button>
            <button
              onClick={() => setStep('phone')}
              className="w-full text-gray-500 text-sm py-2"
            >
              Change number
            </button>
          </div>
        )}

        {step === 'name' && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">What should we call you?</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-[#1a1a2e] rounded-xl px-4 py-4 text-white outline-none text-lg"
                autoFocus
              />
            </div>
            <button
              onClick={handleComplete}
              className="w-full bg-green-500 text-white py-4 rounded-2xl font-bold text-base"
            >
              Start Playing
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 py-6 text-center">
        <p className="text-xs text-gray-600">
          By continuing, you agree to our Terms of Service
        </p>
      </div>
    </div>
  );
}
