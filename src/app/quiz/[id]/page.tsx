'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, Check, Clock, Trophy, Users, Ticket, Star, Gift } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort, formatMoney } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import type { Bet, Transaction } from '@/types';

export default function QuizDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { quizzes, user, bets, addBet, addTransaction, updateBalance } = useStore();
  const quiz = quizzes.find((q) => q.id === id);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!quiz) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-500">Quiz not found</p>
      </div>
    );
  }

  const totalPicks = quiz.options.reduce((sum, o) => sum + o.pick_count, 0);
  const prizePerWinner = quiz.winner_count > 0
    ? Math.floor(quiz.prize_pool / quiz.winner_count)
    : 0;
  const alreadyJoined = bets.some(b => b.quiz_id === quiz.id && b.user_id === user?.id);
  const isActive = quiz.status === 'active';
  const canJoin = isActive && selectedOption && !placing && !alreadyJoined
    && (user?.balance ?? 0) >= quiz.entry_fee;

  // Platform revenue calculation (for info)
  const totalRevenue = quiz.entry_fee * quiz.participants;
  const platformProfit = totalRevenue - quiz.prize_pool;

  function handleJoinQuiz() {
    if (!canJoin || !user || !quiz) return;
    setPlacing(true);

    const bet: Bet = {
      id: uuidv4(),
      user_id: user.id,
      bet_type: 'quiz',
      quiz_id: quiz.id,
      option_id: selectedOption!,
      amount: quiz.entry_fee,
      fund_source: 'balance',
      potential_win: prizePerWinner,
      status: 'pending',
      created_at: new Date().toISOString(),
    };

    const tx: Transaction = {
      id: uuidv4(),
      user_id: user.id,
      type: 'bet_placed',
      amount: -quiz.entry_fee,
      balance_after: user.balance - quiz.entry_fee,
      fund_type: 'balance',
      reference_id: bet.id,
      description: `Quiz entry: ${quiz.question.slice(0, 40)}...`,
      created_at: new Date().toISOString(),
    };

    addBet(bet);
    addTransaction(tx);
    updateBalance(-quiz.entry_fee, 'balance');

    setTimeout(() => {
      setPlacing(false);
      setSuccess(true);
    }, 500);
  }

  // Success screen after joining
  if (success) {
    const selectedOpt = quiz.options.find(o => o.id === selectedOption);
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-purple-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">You&apos;re In!</h2>
        <p className="text-gray-400 text-sm mb-1">
          Your answer: <span className="text-white font-semibold">{selectedOpt?.label}</span>
        </p>
        <p className="text-gray-400 text-sm mb-1">
          Entry fee: {formatMoney(quiz.entry_fee)}
        </p>
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 mt-4 mb-6 mx-8">
          <p className="text-xs text-gray-400 mb-1">If you answer correctly & get drawn</p>
          <p className="text-yellow-400 font-bold text-2xl">{formatMoney(prizePerWinner)}</p>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Draw at: {quiz.draw_at ? new Date(quiz.draw_at).toLocaleString('en-ZA') : 'TBA'}
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
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-purple-500/20 rounded-full p-2">
            <HelpCircle size={20} className="text-purple-400" />
          </div>
          <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
            {quiz.category}
          </span>
          {!isActive && (
            <span className="text-xs text-gray-400 bg-gray-400/10 px-2 py-0.5 rounded-full ml-auto">
              {quiz.status === 'settled' ? 'Drawn' : quiz.status}
            </span>
          )}
        </div>
        <h2 className="text-lg font-bold leading-snug">{quiz.question}</h2>
      </div>

      {/* Prize Info */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <Trophy size={20} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Total Prize Pool</p>
            <p className="text-yellow-400 font-bold text-lg">{formatMoneyShort(quiz.prize_pool)}</p>
          </div>
          <div className="text-center">
            <Gift size={20} className="text-yellow-400 mx-auto mb-1" />
            <p className="text-xs text-gray-400">Per Winner ({quiz.winner_count})</p>
            <p className="text-yellow-400 font-bold text-lg">{formatMoneyShort(prizePerWinner)}</p>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Ticket size={12} />
          Entry: {formatMoneyShort(quiz.entry_fee)}
        </span>
        <span className="flex items-center gap-1">
          <Users size={12} />
          {quiz.participants.toLocaleString()} joined
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {isActive ? 'Ends' : 'Ended'} {new Date(quiz.expires_at).toLocaleDateString('en-ZA', {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          })}
        </span>
      </div>

      {/* How it works */}
      {isActive && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Star size={14} className="text-yellow-400" /> How it works
          </h3>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Pay {formatMoneyShort(quiz.entry_fee)} entry fee & pick your answer</li>
            <li>Correct answers enter the lottery draw</li>
            <li>{quiz.winner_count} lucky winners drawn randomly</li>
            <li>Each winner gets {formatMoneyShort(prizePerWinner)}!</li>
          </ol>
        </div>
      )}

      {/* Options */}
      <h3 className="font-semibold text-sm mb-2">
        {isActive ? 'Pick your answer' : 'Answers'}
      </h3>
      <div className="space-y-2 mb-5">
        {quiz.options.map((opt) => {
          const pct = totalPicks > 0
            ? Math.round((opt.pick_count / totalPicks) * 100)
            : Math.round(100 / quiz.options.length);
          const isCorrect = quiz.correct_option_id === opt.id;
          const isSelected = selectedOption === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => isActive && !alreadyJoined && setSelectedOption(opt.id)}
              disabled={!isActive || alreadyJoined}
              className={`w-full p-4 rounded-xl text-left transition-all border-2 relative overflow-hidden ${
                isCorrect
                  ? 'border-green-500 bg-green-500/10'
                  : isSelected
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-transparent bg-[#1a1a2e]'
              }`}
            >
              {/* Background bar */}
              <div
                className={`absolute inset-y-0 left-0 ${isCorrect ? 'bg-green-500/10' : 'bg-purple-500/5'}`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCorrect && <Check size={16} className="text-green-400" />}
                  <span className="font-medium text-sm">{opt.label}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500">
                    {pct}% &middot; {opt.pick_count.toLocaleString()} picks
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Already joined notice */}
      {alreadyJoined && isActive && (
        <div className="bg-purple-500/10 rounded-xl p-4 text-center mb-4">
          <Check size={20} className="text-purple-400 mx-auto mb-1" />
          <p className="text-sm text-purple-400 font-semibold">You&apos;ve already joined this quiz!</p>
          <p className="text-xs text-gray-400 mt-1">
            Wait for the draw at {quiz.draw_at ? new Date(quiz.draw_at).toLocaleString('en-ZA') : 'TBA'}
          </p>
        </div>
      )}

      {/* Join button */}
      {isActive && !alreadyJoined && (
        <div className="space-y-3">
          <div className="bg-[#1a1a2e] rounded-xl p-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">Entry Fee</span>
              <span className="font-bold">{formatMoney(quiz.entry_fee)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Your Balance</span>
              <span className={`font-medium ${(user?.balance ?? 0) >= quiz.entry_fee ? 'text-green-400' : 'text-red-400'}`}>
                {formatMoney(user?.balance ?? 0)}
              </span>
            </div>
          </div>

          <button
            onClick={handleJoinQuiz}
            disabled={!canJoin}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              canJoin
                ? 'bg-purple-500 text-white active:bg-purple-600'
                : 'bg-gray-700 text-gray-500'
            }`}
          >
            {placing
              ? 'Joining...'
              : !selectedOption
                ? 'Pick an answer first'
                : (user?.balance ?? 0) < quiz.entry_fee
                  ? 'Insufficient balance'
                  : `Join Quiz - ${formatMoney(quiz.entry_fee)}`
            }
          </button>
        </div>
      )}

      {/* Settled: Show winners */}
      {quiz.status === 'settled' && quiz.winners && quiz.winners.length > 0 && (
        <div className="bg-[#1a1a2e] rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Trophy size={14} className="text-yellow-400" /> Winners
          </h3>
          <div className="space-y-2">
            {quiz.winners.map((w, i) => (
              <div key={w.user_id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-6">{i + 1}.</span>
                  <span className="text-gray-300">{w.display_name}</span>
                </div>
                <span className="text-yellow-400 font-semibold">{formatMoney(w.prize_amount)}</span>
              </div>
            ))}
            {quiz.winners.length < quiz.winner_count && (
              <p className="text-xs text-gray-500 text-center pt-2">
                ...and {quiz.winner_count - quiz.winners.length} more winners
              </p>
            )}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Correct answers</span>
              <span>{quiz.correct_count.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Winners drawn</span>
              <span>{quiz.winner_count}</span>
            </div>
            <div className="flex justify-between">
              <span>Prize per winner</span>
              <span className="text-yellow-400">{formatMoney(prizePerWinner)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
