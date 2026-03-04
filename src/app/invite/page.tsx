'use client';

import { useState } from 'react';
import { Users, Copy, Share2, Check, Gift } from 'lucide-react';
import { useStore } from '@/store/useStore';

export default function InvitePage() {
  const { user } = useStore();
  const [copied, setCopied] = useState(false);

  const referralLink = `https://betgame.app/join?ref=${user?.referral_code || ''}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join BetGame!',
          text: `Join BetGame and get R5 FREE! Use my code: ${user?.referral_code}`,
          url: referralLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      handleCopy();
    }
  };

  // Mock referral history
  const referrals = [
    { name: '+27 81***4521', date: '2 Mar 2026', bonus: 'R5' },
    { name: '+27 72***8890', date: '1 Mar 2026', bonus: 'R5' },
  ];

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Hero */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-500 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift size={32} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">Invite & Earn</h2>
        <p className="text-green-100 text-sm mt-2 leading-relaxed">
          Share your referral code with friends.<br />
          When they sign up, you <span className="font-bold text-white">both get R5</span> free bets!
        </p>
      </div>

      {/* Referral Code */}
      <div className="bg-[#1a1a2e] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">Your Referral Code</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#0f0f23] rounded-lg px-4 py-3 text-center">
            <span className="text-xl font-bold tracking-widest text-green-400">
              {user?.referral_code || 'LOGIN FIRST'}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className="bg-[#0f0f23] rounded-lg p-3 active:bg-green-500/20"
          >
            {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Share Link */}
      <div className="bg-[#1a1a2e] rounded-xl p-4">
        <p className="text-xs text-gray-500 mb-2">Share Link</p>
        <div className="bg-[#0f0f23] rounded-lg px-3 py-2.5 mb-3">
          <p className="text-xs text-gray-400 truncate">{referralLink}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 bg-[#0f0f23] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-gray-700 active:bg-green-500/20"
          >
            <Copy size={16} /> {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button
            onClick={handleShare}
            className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Share2 size={16} /> Share
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-[#1a1a2e] rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3">How it works</h3>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Share your code or link with a friend' },
            { step: '2', text: 'They sign up using your code' },
            { step: '3', text: 'You both get R5 free bets instantly!' },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                <span className="text-green-400 font-bold text-sm">{item.step}</span>
              </div>
              <p className="text-sm text-gray-300">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral History */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Your Referrals</h3>
        <div className="space-y-2">
          {referrals.map((ref, i) => (
            <div key={i} className="bg-[#1a1a2e] rounded-xl p-3.5 flex items-center gap-3">
              <div className="bg-green-500/20 rounded-full p-2">
                <Users size={16} className="text-green-400" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{ref.name}</p>
                <p className="text-xs text-gray-500">{ref.date}</p>
              </div>
              <span className="text-green-400 font-bold text-sm">+{ref.bonus}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
