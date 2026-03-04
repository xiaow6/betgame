'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Clock, Users } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort, formatMoney } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import type { Bet, Transaction, FundSource } from '@/types';

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { events, user, addBet, addTransaction, updateBalance } = useStore();
  const event = events.find((e) => e.id === id);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [fundSource, setFundSource] = useState<FundSource>('balance');
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!event) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-500">Event not found</p>
      </div>
    );
  }

  const selectedOpt = event.options.find((o) => o.id === selectedOption);
  const amountCents = Math.round(parseFloat(amount || '0') * 100);
  const potentialWin = selectedOpt ? Math.round(amountCents * selectedOpt.odds) : 0;

  const availableBalance = fundSource === 'balance'
    ? (user?.balance ?? 0)
    : (user?.free_bet_balance ?? 0);

  const canPlace = selectedOption
    && amountCents >= event.min_bet
    && amountCents <= event.max_bet
    && amountCents <= availableBalance
    && !placing;

  function handlePlaceBet() {
    if (!canPlace || !user || !selectedOpt || !event) return;
    setPlacing(true);

    const bet: Bet = {
      id: uuidv4(),
      user_id: user.id,
      bet_type: 'sport',
      event_id: event.id,
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
      description: `Bet on ${selectedOpt.label} (${event.home_team} vs ${event.away_team})`,
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
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trophy size={32} className="text-green-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">Bet Placed!</h2>
        <p className="text-gray-400 text-sm mb-1">
          {selectedOpt?.label} · {formatMoney(amountCents)}
        </p>
        <p className="text-green-400 text-sm mb-6">
          Potential win: {formatMoney(potentialWin)}
        </p>
        <button
          onClick={() => router.push('/betting')}
          className="bg-green-500 text-white font-semibold px-8 py-3 rounded-full"
        >
          Back to Events
        </button>
      </div>
    );
  }

  const totalBets = event.options.reduce((sum, o) => sum + o.bet_count, 0);

  return (
    <div className="px-4 py-4">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-4">
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      {/* Event Info */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 uppercase">{event.category}</span>
          <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
            {event.status}
          </span>
        </div>
        <h2 className="text-lg font-bold">{event.home_team} vs {event.away_team}</h2>
        <p className="text-gray-500 text-sm">{event.title}</p>

        <div className="flex gap-4 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {new Date(event.start_time).toLocaleDateString('en-ZA', {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            })}
          </span>
          <span className="flex items-center gap-1">
            <Users size={12} /> {totalBets} bets
          </span>
          <span className="flex items-center gap-1">
            <Trophy size={12} /> {formatMoneyShort(event.total_pool)}
          </span>
        </div>
      </div>

      {/* Select Outcome */}
      <h3 className="font-semibold text-sm mb-2">Pick your outcome</h3>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {event.options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelectedOption(opt.id)}
            className={`p-3 rounded-xl text-center transition-all border-2 ${
              selectedOption === opt.id
                ? 'border-green-500 bg-green-500/10'
                : 'border-transparent bg-[#1a1a2e]'
            }`}
          >
            <p className="text-sm font-medium truncate">{opt.label}</p>
            <p className="text-green-400 font-bold text-lg mt-1">{opt.odds.toFixed(2)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">{opt.bet_count} bets</p>
          </button>
        ))}
      </div>

      {/* Bet Amount */}
      {selectedOption && (
        <div className="space-y-4">
          {/* Fund Source */}
          <div className="flex gap-2">
            <button
              onClick={() => setFundSource('balance')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                fundSource === 'balance'
                  ? 'bg-green-500 text-white'
                  : 'bg-[#1a1a2e] text-gray-400'
              }`}
            >
              Balance {formatMoneyShort(user?.balance ?? 0)}
            </button>
            <button
              onClick={() => setFundSource('free_bet')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                fundSource === 'free_bet'
                  ? 'bg-yellow-500 text-black'
                  : 'bg-[#1a1a2e] text-gray-400'
              }`}
            >
              Free Bet {formatMoneyShort(user?.free_bet_balance ?? 0)}
            </button>
          </div>

          {/* Amount Input */}
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
                min={event.min_bet / 100}
                max={event.max_bet / 100}
                step="0.5"
              />
            </div>
            <div className="flex gap-2 mt-3">
              {[1, 5, 10, 20, 50].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(v.toString())}
                  className="flex-1 bg-[#0f0f23] text-gray-400 py-1.5 rounded-lg text-xs font-medium active:bg-green-500/20"
                >
                  R{v}
                </button>
              ))}
            </div>
          </div>

          {/* Summary */}
          {amountCents > 0 && selectedOpt && (
            <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Selection</span>
                <span className="font-medium">{selectedOpt.label}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Odds</span>
                <span className="text-green-400 font-medium">{selectedOpt.odds.toFixed(2)}</span>
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

          {/* Place Bet Button */}
          <button
            onClick={handlePlaceBet}
            disabled={!canPlace}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              canPlace
                ? 'bg-green-500 text-white active:bg-green-600'
                : 'bg-gray-700 text-gray-500'
            }`}
          >
            {placing ? 'Placing...' : `Place Bet ${amountCents > 0 ? formatMoney(amountCents) : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}
