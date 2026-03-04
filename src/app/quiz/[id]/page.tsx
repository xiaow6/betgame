'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, Check, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort, formatMoney } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import type { Bet, Transaction, FundSource } from '@/types';

export default function QuizDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { quizzes, user, addBet, addTransaction, updateBalance } = useStore();
  const quiz = quizzes.find((q) => q.id === id);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [fundSource, setFundSource] = useState<FundSource>('balance');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!quiz) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-500">Quiz not found</p>
      </div>
    );
  }

  const selectedOpt = quiz.options.find((o) => o.id === selectedOption);
  const amountCents = Math.round(parseFloat(amount || '0') * 100);
  const totalBets = quiz.options.reduce((sum, o) => sum + o.bet_count, 0);

  // Calculate proportional odds based on pool distribution
  const getQuizOdds = (optionAmount: number) => {
    if (optionAmount === 0 || quiz.total_pool === 0) return 2.0;
    const afterRake = quiz.total_pool * (1 - quiz.rake_percent / 100);
    return afterRake / optionAmount;
  };

  const potentialWin = selectedOpt
    ? Math.round(amountCents * getQuizOdds(selectedOpt.total_amount))
    : 0;

  const availableBalance = fundSource === 'balance'
    ? (user?.balance ?? 0)
    : (user?.free_bet_balance ?? 0);

  const canPlace = selectedOption
    && amountCents >= quiz.min_bet
    && amountCents <= quiz.max_bet
    && amountCents <= availableBalance
    && !placing;

  function handlePlaceBet() {
    if (!canPlace || !user || !selectedOpt || !quiz) return;
    setPlacing(true);

    const bet: Bet = {
      id: uuidv4(),
      user_id: user.id,
      bet_type: 'quiz',
      quiz_id: quiz.id,
      option_id: selectedOption!,
      amount: amountCents,
      fund_source: fundSource,
      potential_win: potentialWin,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const tx: Transaction = {
      id: uuidv4(),
      user_id: user.id,
      type: 'bet_placed',
      amount: -amountCents,
      balance_after: availableBalance - amountCents,
      fund_type: fundSource === 'balance' ? 'balance' : 'free_bet',
      reference_id: bet.id,
      description: `Quiz: ${selectedOpt.label} (${quiz.question.slice(0, 30)}...)`,
      created_at: new Date().toISOString(),
    };

    addBet(bet);
    addTransaction(tx);
    updateBalance(-amountCents, fundSource === 'balance' ? 'balance' : 'free_bet');

    setTimeout(() => {
      setPlacing(false);
      setSuccess(true);
    }, 500);
  }

  if (success) {
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-purple-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Answer Locked In!</h2>
        <p className="text-gray-400 text-sm mb-1">
          {selectedOpt?.label} · {formatMoney(amountCents)}
        </p>
        <p className="text-green-400 text-sm mb-6">
          Potential win: {formatMoney(potentialWin)}
        </p>
        <button
          onClick={() => router.push('/quiz')}
          className="bg-purple-500 text-white font-semibold px-8 py-3 rounded-full"
        >
          More Quizzes
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-4">
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      {/* Quiz Card */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-purple-500/20 rounded-full p-2">
            <HelpCircle size={20} className="text-purple-400" />
          </div>
          <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
            {quiz.category}
          </span>
        </div>
        <h2 className="text-lg font-bold leading-snug">{quiz.question}</h2>
        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span>{totalBets} players</span>
          <span>Pool: {formatMoneyShort(quiz.total_pool)}</span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            Ends {new Date(quiz.expires_at).toLocaleDateString('en-ZA', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
        </div>
      </div>

      {/* Options */}
      <h3 className="font-semibold text-sm mb-2">Pick your answer</h3>
      <div className="space-y-2 mb-5">
        {quiz.options.map((opt) => {
          const pct = quiz.total_pool > 0
            ? Math.round((opt.total_amount / quiz.total_pool) * 100)
            : 25;
          return (
            <button
              key={opt.id}
              onClick={() => setSelectedOption(opt.id)}
              className={`w-full p-4 rounded-xl text-left transition-all border-2 relative overflow-hidden ${
                selectedOption === opt.id
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-transparent bg-[#1a1a2e]'
              }`}
            >
              {/* Background bar */}
              <div
                className="absolute inset-y-0 left-0 bg-purple-500/5"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <span className="font-medium text-sm">{opt.label}</span>
                <div className="text-right">
                  <span className="text-green-400 font-bold text-sm">
                    x{getQuizOdds(opt.total_amount).toFixed(2)}
                  </span>
                  <p className="text-[10px] text-gray-500">{pct}% · {opt.bet_count} picks</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Bet Amount */}
      {selectedOption && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setFundSource('balance')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                fundSource === 'balance' ? 'bg-green-500 text-white' : 'bg-[#1a1a2e] text-gray-400'
              }`}
            >
              Balance {formatMoneyShort(user?.balance ?? 0)}
            </button>
            <button
              onClick={() => setFundSource('free_bet')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                fundSource === 'free_bet' ? 'bg-yellow-500 text-black' : 'bg-[#1a1a2e] text-gray-400'
              }`}
            >
              Free Bet {formatMoneyShort(user?.free_bet_balance ?? 0)}
            </button>
          </div>

          <div className="bg-[#1a1a2e] rounded-xl p-4">
            <label className="text-xs text-gray-500 mb-2 block">Bet Amount (R)</label>
            <div className="flex items-center gap-2">
              <span className="text-2xl text-gray-500">R</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 bg-transparent text-2xl font-bold outline-none text-white"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[1, 2, 5, 10, 20].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v.toString())}
                  className="flex-1 bg-[#0f0f23] text-gray-400 py-1.5 rounded-lg text-xs font-medium active:bg-purple-500/20"
                >
                  R{v}
                </button>
              ))}
            </div>
          </div>

          {amountCents > 0 && selectedOpt && (
            <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Answer</span>
                <span className="font-medium">{selectedOpt.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Multiplier</span>
                <span className="text-green-400">x{getQuizOdds(selectedOpt.total_amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Stake</span>
                <span>{formatMoney(amountCents)}</span>
              </div>
              <div className="border-t border-gray-800 pt-2 flex justify-between">
                <span className="text-gray-400 text-sm">Potential Win</span>
                <span className="text-green-400 font-bold text-lg">{formatMoney(potentialWin)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handlePlaceBet}
            disabled={!canPlace}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              canPlace
                ? 'bg-purple-500 text-white active:bg-purple-600'
                : 'bg-gray-700 text-gray-500'
            }`}
          >
            {placing ? 'Locking in...' : `Lock In Answer ${amountCents > 0 ? formatMoney(amountCents) : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
