'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock, Trophy, Tv } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort, formatMoney } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';
import type { Bet, Transaction } from '@/types';

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return <span className="font-mono font-bold text-2xl text-white">{timeLeft}</span>;
}

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
        <p className="text-gray-500">Not found</p>
      </div>
    );
  }

  const prizePerWinner = quiz.winner_count > 0
    ? Math.floor(quiz.prize_pool / quiz.winner_count)
    : 0;
  const alreadyJoined = bets.some(b => b.quiz_id === quiz.id && b.user_id === user?.id);
  const isActive = quiz.status === 'active';
  const canJoin = isActive && selectedOption && !placing && !alreadyJoined
    && (user?.balance ?? 0) >= quiz.entry_fee;

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
      description: `TV Grand Prize: ${quiz.question.slice(0, 30)}...`,
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

  // Success screen
  if (success) {
    const selectedOpt = quiz.options.find(o => o.id === selectedOption);
    return (
      <div className="px-4 py-12 text-center">
        <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-yellow-400" />
        </div>
        <h2 className="text-xl font-bold mb-2">You&apos;re In!</h2>
        <p className="text-gray-400 text-sm mb-4">
          Your answer: <span className="text-white font-semibold">{selectedOpt?.label}</span>
        </p>
        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-xl p-4 mb-6 mx-8">
          <p className="text-xs text-gray-400 mb-1">You could win</p>
          <p className="text-yellow-400 font-bold text-3xl">{formatMoney(prizePerWinner)}</p>
        </div>
        <p className="text-xs text-gray-500 mb-6">
          Draw starts at {quiz.draw_at ? new Date(quiz.draw_at).toLocaleString('en-ZA') : 'TBA'}
        </p>
        <button
          onClick={() => router.push('/quiz')}
          className="bg-yellow-500 text-black font-semibold px-8 py-3 rounded-full"
        >
          More Prizes
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

      {/* Prize Hero */}
      <div className="bg-gradient-to-br from-yellow-500/15 to-orange-500/15 rounded-2xl p-5 mb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Tv size={20} className="text-yellow-400" />
          <span className="text-xs text-yellow-400/80 font-semibold uppercase tracking-wider">TV Grand Prize</span>
        </div>
        <p className="text-yellow-400 font-bold text-4xl mb-1">{formatMoneyShort(quiz.prize_pool)}</p>
        <p className="text-xs text-gray-400">
          {quiz.winner_count} winners &middot; {formatMoneyShort(prizePerWinner)} each
        </p>
      </div>

      {/* Countdown */}
      {isActive && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock size={14} className="text-red-400" />
            <span className="text-xs text-red-400 font-semibold uppercase">Time Remaining</span>
          </div>
          <Countdown expiresAt={quiz.expires_at} />
        </div>
      )}

      {/* Question */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4">
        <h2 className="text-lg font-bold leading-snug">{quiz.question}</h2>
      </div>

      {/* Options */}
      <h3 className="font-semibold text-sm mb-2">
        {isActive ? 'Pick your answer' : 'Answers'}
      </h3>
      <div className="space-y-2 mb-5">
        {quiz.options.map((opt) => {
          const isCorrect = quiz.correct_option_id === opt.id;
          const isSelected = selectedOption === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => isActive && !alreadyJoined && setSelectedOption(opt.id)}
              disabled={!isActive || alreadyJoined}
              className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                isCorrect
                  ? 'border-green-500 bg-green-500/10'
                  : isSelected
                    ? 'border-yellow-500 bg-yellow-500/10'
                    : 'border-transparent bg-[#1a1a2e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isCorrect
                    ? 'border-green-500 bg-green-500'
                    : isSelected
                      ? 'border-yellow-500 bg-yellow-500'
                      : 'border-gray-600'
                }`}>
                  {(isSelected || isCorrect) && <Check size={12} className={isCorrect ? 'text-white' : 'text-black'} />}
                </div>
                <span className={`font-medium text-sm ${isCorrect ? 'text-green-400' : ''}`}>
                  {opt.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Already joined */}
      {alreadyJoined && isActive && (
        <div className="bg-yellow-500/10 rounded-xl p-4 text-center mb-4">
          <Check size={20} className="text-yellow-400 mx-auto mb-1" />
          <p className="text-sm text-yellow-400 font-semibold">You&apos;re in the draw!</p>
          <p className="text-xs text-gray-400 mt-1">Good luck! Results announced live on TV.</p>
        </div>
      )}

      {/* Join button */}
      {isActive && !alreadyJoined && (
        <div className="space-y-3">
          <button
            onClick={handleJoinQuiz}
            disabled={!canJoin}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all ${
              canJoin
                ? 'bg-yellow-500 text-black active:bg-yellow-600'
                : 'bg-gray-700 text-gray-500'
            }`}
          >
            {placing
              ? 'Joining...'
              : !selectedOption
                ? 'Pick an answer to enter'
                : (user?.balance ?? 0) < quiz.entry_fee
                  ? 'Insufficient balance'
                  : `Enter for ${formatMoney(quiz.entry_fee)} - Win ${formatMoneyShort(prizePerWinner)}!`
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
        </div>
      )}
    </div>
  );
}
