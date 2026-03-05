'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Check, Clock, Trophy, Tv, Share2, Sparkles, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort, formatMoney } from '@/lib/constants';
import type { Quiz, Bet } from '@/types';

// ─── Countdown Timer ───
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [h, setH] = useState('00');
  const [m, setM] = useState('00');
  const [s, setS] = useState('00');
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setEnded(true); return; }
      setH(Math.floor(diff / 3600000).toString().padStart(2, '0'));
      setM(Math.floor((diff % 3600000) / 60000).toString().padStart(2, '0'));
      setS(Math.floor((diff % 60000) / 1000).toString().padStart(2, '0'));
    }
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (ended) return <span className="text-red-400 font-bold text-xl">ENDED</span>;

  return (
    <div className="flex items-center gap-1">
      {[h, m, s].map((v, i) => (
        <div key={i} className="flex items-center gap-1">
          <div className="bg-[#0f0f23] rounded-lg px-3 py-2 min-w-[48px] text-center">
            <span className="font-mono font-bold text-2xl text-white">{v}</span>
          </div>
          {i < 2 && <span className="text-gray-500 font-bold text-xl animate-count-pulse">:</span>}
        </div>
      ))}
    </div>
  );
}

// ─── Confetti Effect ───
function Confetti() {
  const [pieces, setPieces] = useState<{ id: number; left: number; color: string; delay: number; duration: number; size: number }[]>([]);

  useEffect(() => {
    const colors = ['#eab308', '#f59e0b', '#fbbf24', '#fde047', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'];
    const newPieces = Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8,
      duration: 1.5 + Math.random() * 2,
      size: 6 + Math.random() * 8,
    }));
    setPieces(newPieces);
  }, []);

  return (
    <>
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </>
  );
}

// ─── Main Page ───
export default function QuizDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, updateBalance } = useStore();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [myBet, setMyBet] = useState<Bet | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [error, setError] = useState('');

  // Fetch quiz and user's bet
  useEffect(() => {
    async function load() {
      try {
        const [quizRes, betRes] = await Promise.all([
          fetch(`/api/quizzes/${id}`).then(r => r.json()),
          user?.id
            ? fetch(`/api/user/bets?user_id=${user.id}`).then(r => r.json())
            : Promise.resolve({ data: [] }),
        ]);

        if (quizRes.success) setQuiz(quizRes.data);
        if (betRes.data) {
          const existing = betRes.data.find((b: Bet) => b.quiz_id === id);
          if (existing) setMyBet(existing);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, user?.id]);

  const alreadyJoined = !!myBet;

  const handleJoinQuiz = useCallback(async () => {
    if (!quiz || !user || !selectedOption || placing || alreadyJoined) return;
    if (user.balance < quiz.entry_fee) return;

    setPlacing(true);
    setError('');

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          option_id: selectedOption,
          amount: quiz.entry_fee,
          fund_source: 'balance',
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to place bet');
        setPlacing(false);
        return;
      }

      // Update local state
      if (data.data?.bet) setMyBet(data.data.bet);
      updateBalance(-quiz.entry_fee, 'balance');

      // Trigger animations
      setTimeout(() => {
        setPlacing(false);
        setShowConfetti(true);
        setSuccessAnim(true);
        setTimeout(() => setShowConfetti(false), 4000);
      }, 600);
    } catch {
      setError('Network error, please try again');
      setPlacing(false);
    }
  }, [quiz, user, selectedOption, placing, alreadyJoined, updateBalance]);

  async function handleInvite() {
    if (!quiz) return;
    const shareText = `I just entered to win ${formatMoneyShort(quiz.prize_pool)} on BetGame TV Grand Prize! Join with just ${formatMoneyShort(quiz.entry_fee)} - use my code: ${user?.referral_code || 'BETGAME'}`;
    const shareUrl = `https://betgame.app/join?ref=${user?.referral_code || ''}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Win Big on BetGame!', text: shareText, url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      } catch { /* fallback */ }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

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
  const isActive = quiz.status === 'active';
  const canJoin = isActive && selectedOption && !placing && !alreadyJoined
    && (user?.balance ?? 0) >= quiz.entry_fee;
  const myPickedOption = myBet ? quiz.options.find(o => o.id === myBet.option_id) : null;
  const myEntries = 1;

  // ─── Success overlay after joining ───
  if (successAnim) {
    const selectedOpt = quiz.options.find(o => o.id === selectedOption);
    return (
      <div className="px-4 py-6 min-h-screen flex flex-col justify-center">
        {showConfetti && <Confetti />}

        <div className="text-center animate-bounce-in">
          <div className="relative inline-block mb-5">
            <div className="absolute inset-0 rounded-full animate-prize-glow" />
            <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center relative">
              <Trophy size={40} className="text-yellow-400 animate-float" />
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            You&apos;re In!
          </h2>
          <p className="text-gray-400 text-sm mb-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Your answer: <span className="text-yellow-400 font-bold">{selectedOpt?.label}</span>
          </p>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="bg-gradient-to-br from-yellow-500/15 to-orange-500/15 rounded-2xl p-6 text-center animate-prize-glow mb-4">
            <p className="text-xs text-gray-400 mb-1">You could win</p>
            <p className="text-yellow-400 font-bold text-4xl mb-1">{formatMoney(prizePerWinner)}</p>
            <div className="animate-shimmer rounded-lg py-1 mt-2">
              <p className="text-[11px] text-yellow-400/70">Draw starts at {quiz.draw_at ? new Date(quiz.draw_at).toLocaleString('en-ZA') : 'TBA'}</p>
            </div>
          </div>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="bg-[#1a1a2e] rounded-2xl p-5 text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles size={16} className="text-yellow-400" />
              <span className="text-sm font-bold text-yellow-400">Boost Your Chances!</span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Each friend you invite gives you an extra entry into the draw
            </p>
            <button
              onClick={handleInvite}
              className="w-full bg-green-500 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-green-600"
            >
              <Share2 size={16} /> Invite Friends - Get More Entries
            </button>
          </div>
        </div>

        <div className="animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <button
            onClick={() => setSuccessAnim(false)}
            className="w-full py-3 text-gray-400 text-sm"
          >
            Back to prize details
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 pb-24">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-4">
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      {/* Prize Hero with glow */}
      <div className="bg-gradient-to-br from-yellow-500/15 to-orange-500/15 rounded-2xl p-5 mb-4 text-center animate-prize-glow">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Tv size={18} className="text-yellow-400" />
          <span className="text-[11px] text-yellow-400/80 font-semibold uppercase tracking-wider">TV Grand Prize</span>
        </div>
        <p className="text-yellow-400 font-bold text-4xl mb-1">{formatMoneyShort(quiz.prize_pool)}</p>
        <p className="text-xs text-gray-400">
          {quiz.winner_count} winners &middot; {formatMoneyShort(prizePerWinner)} each
        </p>
      </div>

      {/* Countdown */}
      {isActive && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock size={14} className="text-red-400" />
            <span className="text-[11px] text-red-400 font-semibold uppercase tracking-wider">Closing In</span>
          </div>
          <Countdown expiresAt={quiz.expires_at} />
        </div>
      )}

      {/* My Bet Status (if already joined) */}
      {alreadyJoined && isActive && (
        <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
              <Check size={16} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-green-400">You&apos;re in the draw!</p>
              <p className="text-[11px] text-gray-400">Results announced live on TV</p>
            </div>
          </div>

          <div className="bg-[#0f0f23] rounded-lg p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Your answer</span>
              <span className="text-white font-semibold">{myPickedOption?.label}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Entry paid</span>
              <span className="text-white">{formatMoney(myBet!.amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Your entries</span>
              <span className="text-yellow-400 font-bold">{myEntries}x</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Potential prize</span>
              <span className="text-yellow-400 font-bold">{formatMoney(prizePerWinner)}</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-green-500/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-yellow-400" />
              <span className="text-xs font-bold text-yellow-400">Want more chances to win?</span>
            </div>
            <p className="text-[11px] text-gray-400 mb-3">
              Invite a friend = 1 extra draw entry for you. More friends = more chances!
            </p>
            <button
              onClick={handleInvite}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:bg-green-600"
            >
              <Share2 size={16} /> Invite Friends for Extra Entries
            </button>
          </div>
        </div>
      )}

      {/* Question */}
      <div className="bg-[#1a1a2e] rounded-xl p-4 mb-4">
        <h2 className="text-lg font-bold leading-snug">{quiz.question}</h2>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-center">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Options */}
      {!alreadyJoined && (
        <h3 className="font-semibold text-sm mb-2">
          {isActive ? 'Pick your answer' : 'Answers'}
        </h3>
      )}
      <div className="space-y-2 mb-5">
        {quiz.options.map((opt) => {
          const isCorrect = quiz.correct_option_id === opt.id;
          const isSelected = selectedOption === opt.id;
          const isMyPick = myBet?.option_id === opt.id;

          return (
            <button
              key={opt.id}
              onClick={() => isActive && !alreadyJoined && setSelectedOption(opt.id)}
              disabled={!isActive || alreadyJoined}
              className={`w-full p-4 rounded-xl text-left transition-all border-2 ${
                isCorrect
                  ? 'border-green-500 bg-green-500/10'
                  : isMyPick
                    ? 'border-yellow-500/50 bg-yellow-500/5'
                    : isSelected
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-transparent bg-[#1a1a2e]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  isCorrect
                    ? 'border-green-500 bg-green-500'
                    : isMyPick
                      ? 'border-yellow-500 bg-yellow-500'
                      : isSelected
                        ? 'border-yellow-500 bg-yellow-500'
                        : 'border-gray-600'
                }`}>
                  {(isSelected || isCorrect || isMyPick) && (
                    <Check size={12} className={isCorrect ? 'text-white' : 'text-black'} />
                  )}
                </div>
                <span className={`font-medium text-sm flex-1 ${isCorrect ? 'text-green-400' : ''}`}>
                  {opt.label}
                </span>
                {isMyPick && (
                  <span className="text-[10px] text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                    Your pick
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Join button (not yet joined) */}
      {isActive && !alreadyJoined && (
        <div className="fixed bottom-16 left-0 right-0 px-4 pb-3 pt-2 bg-gradient-to-t from-[#0f0f23] via-[#0f0f23] to-transparent">
          <button
            onClick={handleJoinQuiz}
            disabled={!canJoin}
            className={`w-full py-4 rounded-2xl text-base font-bold transition-all max-w-lg mx-auto block ${
              canJoin
                ? 'bg-yellow-500 text-black active:scale-[0.98]'
                : 'bg-gray-700 text-gray-500'
            }`}
          >
            {placing ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Entering...
              </span>
            ) : !selectedOption
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
