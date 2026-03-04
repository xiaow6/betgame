'use client';

import { useState } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Gift, Trophy, RefreshCw, Plus, Minus } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoney, formatMoneyShort } from '@/lib/constants';
import type { TxType } from '@/types';

const txIcons: Record<TxType, typeof Wallet> = {
  deposit: ArrowUpCircle,
  withdrawal: ArrowDownCircle,
  bet_placed: Minus,
  bet_won: Trophy,
  bet_refund: RefreshCw,
  referral_bonus: Gift,
  signup_bonus: Gift,
  admin_adjust: RefreshCw,
};

const txColors: Record<TxType, string> = {
  deposit: 'text-green-400',
  withdrawal: 'text-red-400',
  bet_placed: 'text-orange-400',
  bet_won: 'text-green-400',
  bet_refund: 'text-blue-400',
  referral_bonus: 'text-purple-400',
  signup_bonus: 'text-yellow-400',
  admin_adjust: 'text-gray-400',
};

export default function WalletPage() {
  const { user, transactions } = useStore();
  const [showDeposit, setShowDeposit] = useState(false);

  return (
    <div className="px-4 py-4">
      {/* Balance Card */}
      <div className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-5 mb-5">
        <p className="text-gray-400 text-sm">Total Balance</p>
        <p className="text-3xl font-bold text-white mt-1">
          {formatMoney(user?.balance ?? 0)}
        </p>

        {(user?.free_bet_balance ?? 0) > 0 && (
          <div className="flex items-center gap-1.5 mt-2">
            <Gift size={14} className="text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">
              {formatMoneyShort(user!.free_bet_balance)} Free Bets
            </span>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setShowDeposit(!showDeposit)}
            className="flex-1 bg-green-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Deposit
          </button>
          <button className="flex-1 bg-[#0f0f23] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-gray-700">
            <Minus size={18} /> Withdraw
          </button>
        </div>
      </div>

      {/* Deposit Form (placeholder) */}
      {showDeposit && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 mb-5">
          <h3 className="font-semibold text-sm mb-3">Deposit Funds</h3>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[20, 50, 100, 200, 500, 1000].map((v) => (
              <button
                key={v}
                className="bg-[#0f0f23] text-gray-300 py-3 rounded-xl text-sm font-medium active:bg-green-500/20"
              >
                R{v}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 text-center">
            Payment integration coming soon
          </p>
        </div>
      )}

      {/* Active Bets Summary */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-5">
        <h3 className="font-semibold text-sm mb-2">Quick Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-[#0f0f23] rounded-lg p-3">
            <p className="text-xs text-gray-500">Available</p>
            <p className="text-green-400 font-bold">{formatMoneyShort(user?.balance ?? 0)}</p>
          </div>
          <div className="bg-[#0f0f23] rounded-lg p-3">
            <p className="text-xs text-gray-500">Free Bets</p>
            <p className="text-yellow-400 font-bold">{formatMoneyShort(user?.free_bet_balance ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <h3 className="font-semibold text-sm mb-3">Transaction History</h3>
      <div className="space-y-2">
        {transactions.map((tx) => {
          const Icon = txIcons[tx.type] || Wallet;
          const color = txColors[tx.type] || 'text-gray-400';
          const isCredit = tx.amount > 0;

          return (
            <div key={tx.id} className="bg-[#1a1a2e] rounded-xl p-3.5 flex items-center gap-3">
              <div className={`${color} bg-[#0f0f23] rounded-full p-2`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tx.description}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(tx.created_at).toLocaleDateString('en-ZA', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                  {tx.fund_type === 'free_bet' && (
                    <span className="text-yellow-500 ml-1">(free bet)</span>
                  )}
                </p>
              </div>
              <span className={`font-bold text-sm ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
                {isCredit ? '+' : ''}{formatMoneyShort(tx.amount)}
              </span>
            </div>
          );
        })}

        {transactions.length === 0 && (
          <div className="text-center py-8">
            <Wallet size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
