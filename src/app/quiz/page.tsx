'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Tv, Clock, Trophy, Loader2 } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';
import type { Quiz } from '@/types';

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

  return <span className="font-mono font-bold text-white">{timeLeft}</span>;
}

export default function QuizPage() {
  const [activeQuizzes, setActiveQuizzes] = useState<Quiz[]>([]);
  const [pastQuizzes, setPastQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/quizzes')
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setActiveQuizzes(res.data.active || []);
          setPastQuizzes(res.data.settled || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  const allQuizzes = [...activeQuizzes, ...pastQuizzes];

  return (
    <div className="px-4 py-4">
      <div className="space-y-3">
        {activeQuizzes.map((quiz) => (
          <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
            <div className="bg-gradient-to-br from-[#1a1a2e] to-[#1e1035] rounded-xl overflow-hidden card-press">
              {/* Top: Prize banner */}
              <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 px-4 py-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Trophy size={18} className="text-yellow-400" />
                  <span className="text-yellow-400 font-bold text-2xl">
                    {formatMoneyShort(quiz.prize_pool)}
                  </span>
                </div>
                <p className="text-[11px] text-yellow-400/70">Grand Prize</p>
              </div>

              <div className="px-4 py-3">
                <p className="font-semibold text-sm leading-snug mb-3">{quiz.question}</p>

                {/* Entry fee + Countdown */}
                <div className="flex items-center justify-between">
                  <div className="bg-green-500/10 rounded-lg px-3 py-1.5">
                    <span className="text-green-400 font-bold text-sm">
                      Only {formatMoneyShort(quiz.entry_fee)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Clock size={12} className="text-red-400" />
                    <Countdown expiresAt={quiz.expires_at} />
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Past draws - minimal */}
      {pastQuizzes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Past Draws</h3>
          <div className="space-y-3">
            {pastQuizzes.map((quiz) => (
              <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
                <div className="bg-[#1a1a2e] rounded-xl p-4 opacity-70">
                  <p className="font-semibold text-sm mb-2">{quiz.question}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="text-yellow-400/70">Prize: {formatMoneyShort(quiz.prize_pool)}</span>
                    <span>{quiz.status === 'settled' ? 'Drawn' : 'Cancelled'}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {allQuizzes.length === 0 && (
        <div className="text-center py-12">
          <Tv size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500">No prizes yet</p>
          <p className="text-gray-600 text-sm">Check back soon!</p>
        </div>
      )}
    </div>
  );
}
