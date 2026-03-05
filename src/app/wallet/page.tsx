'use client';

import { useState, useEffect } from 'react';
import { Wallet, ArrowUpCircle, ArrowDownCircle, Gift, Trophy, RefreshCw, Plus, Minus, Check, CreditCard, Smartphone, Building2, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoney, formatMoneyShort } from '@/lib/constants';
import type { TxType, Transaction } from '@/types';

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

type PayMethod = 'eft' | 'card' | 'airtime';

const payMethods = [
  { key: 'eft' as PayMethod, label: 'EFT / Bank', icon: Building2, desc: 'Instant EFT via Ozow' },
  { key: 'card' as PayMethod, label: 'Card', icon: CreditCard, desc: 'Visa / Mastercard' },
  { key: 'airtime' as PayMethod, label: 'Airtime', icon: Smartphone, desc: 'Pay with airtime' },
];

const quickAmounts = [5, 10, 20, 50, 100, 200];

export default function WalletPage() {
  const { user, updateBalance } = useStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PayMethod>('eft');
  const [depositing, setDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState(false);

  // Fetch transactions from API
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/user/transactions?user_id=${user.id}`)
      .then(r => r.json())
      .then(res => { if (res.data) setTransactions(res.data); })
      .catch(() => {});
  }, [user?.id]);

  const amountCents = Math.round(parseFloat(depositAmount || '0') * 100);
  const canDeposit = amountCents >= 500 && amountCents <= 1000000 && !depositing;

  async function handleDeposit() {
    if (!canDeposit || !user) return;
    setDepositing(true);

    try {
      const res = await fetch('/api/payment/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          amount: amountCents,
          method: payMethod,
        }),
      });

      const data = await res.json();

      if (data.success) {
        updateBalance(amountCents, 'balance');
        // Refresh transactions
        const txRes = await fetch(`/api/user/transactions?user_id=${user.id}`);
        const txData = await txRes.json();
        if (txData.data) setTransactions(txData.data);

        setDepositing(false);
        setDepositSuccess(true);
        setTimeout(() => {
          setDepositSuccess(false);
          setShowDeposit(false);
          setDepositAmount('');
        }, 2000);
      } else {
        setDepositing(false);
      }
    } catch {
      setDepositing(false);
    }
  }

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
            onClick={() => { setShowDeposit(!showDeposit); setDepositSuccess(false); }}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
              showDeposit
                ? 'bg-green-600 text-white'
                : 'bg-green-500 text-white active:bg-green-600'
            }`}
          >
            <Plus size={18} /> Deposit
          </button>
          <button className="flex-1 bg-[#0f0f23] text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border border-gray-700 active:bg-gray-800">
            <Minus size={18} /> Withdraw
          </button>
        </div>
      </div>

      {/* Deposit Form */}
      {showDeposit && (
        <div className="bg-[#1a1a2e] rounded-2xl p-4 mb-5 space-y-4">
          {depositSuccess ? (
            <div className="text-center py-6 animate-bounce-in">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-green-400" />
              </div>
              <h3 className="font-bold text-lg text-green-400">Deposit Successful!</h3>
              <p className="text-gray-400 text-sm mt-1">{formatMoney(amountCents)} added to your balance</p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold text-sm">Deposit Funds</h3>

              {/* Payment Method */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {payMethods.map((pm) => {
                    const Icon = pm.icon;
                    const active = payMethod === pm.key;
                    return (
                      <button
                        key={pm.key}
                        onClick={() => setPayMethod(pm.key)}
                        className={`p-3 rounded-xl text-center transition-all border-2 ${
                          active
                            ? 'border-green-500 bg-green-500/10'
                            : 'border-transparent bg-[#0f0f23]'
                        }`}
                      >
                        <Icon size={20} className={`mx-auto mb-1 ${active ? 'text-green-400' : 'text-gray-400'}`} />
                        <p className={`text-xs font-medium ${active ? 'text-green-400' : 'text-gray-300'}`}>{pm.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Amount */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Amount</p>
                <div className="bg-[#0f0f23] rounded-xl p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl text-gray-500 font-bold">R</span>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0"
                      className="flex-1 bg-transparent text-3xl font-bold outline-none text-white"
                      min="5"
                      max="10000"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {quickAmounts.map((v) => (
                    <button
                      key={v}
                      onClick={() => setDepositAmount(v.toString())}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        depositAmount === v.toString()
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-[#0f0f23] text-gray-300 active:bg-green-500/10'
                      }`}
                    >
                      R{v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {amountCents > 0 && (
                <div className="bg-[#0f0f23] rounded-xl p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Deposit</span>
                    <span className="text-white font-semibold">{formatMoney(amountCents)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Fee</span>
                    <span className="text-green-400 font-semibold">FREE</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 flex justify-between text-sm">
                    <span className="text-gray-400">You receive</span>
                    <span className="text-green-400 font-bold text-base">{formatMoney(amountCents)}</span>
                  </div>
                </div>
              )}

              {/* Min notice */}
              {depositAmount && amountCents > 0 && amountCents < 500 && (
                <div className="flex items-center gap-2 text-xs text-orange-400">
                  <AlertCircle size={14} />
                  <span>Minimum deposit is R5</span>
                </div>
              )}

              {/* Deposit button */}
              <button
                onClick={handleDeposit}
                disabled={!canDeposit}
                className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
                  canDeposit
                    ? 'bg-green-500 text-white active:bg-green-600'
                    : 'bg-gray-700 text-gray-500'
                }`}
              >
                {depositing ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  `Deposit ${amountCents >= 500 ? formatMoney(amountCents) : ''}`
                )}
              </button>

              <p className="text-[10px] text-gray-600 text-center">
                Secure payment powered by Ozow. Instant processing, no fees.
              </p>
            </>
          )}
        </div>
      )}

      {/* Quick Summary */}
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
