'use client';

import Link from 'next/link';
import { HelpCircle, Clock, Trophy, Users, Ticket } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort } from '@/lib/constants';

export default function QuizPage() {
  const { quizzes } = useStore();
  const activeQuizzes = quizzes.filter(q => q.status === 'active');
  const pastQuizzes = quizzes.filter(q => q.status !== 'active');

  return (
    <div className="px-4 py-4">
      {/* Active Quizzes */}
      <div className="space-y-3">
        {activeQuizzes.map((quiz) => {
          const prizePerWinner = quiz.winner_count > 0
            ? Math.floor(quiz.prize_pool / quiz.winner_count)
            : 0;

          return (
            <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
              <div className="bg-[#1a1a2e] rounded-xl p-4 card-press">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                    {quiz.category}
                  </span>
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    Open
                  </span>
                </div>

                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-purple-500/20 rounded-full p-2 shrink-0 mt-0.5">
                    <HelpCircle size={18} className="text-purple-400" />
                  </div>
                  <p className="font-semibold text-sm leading-snug">{quiz.question}</p>
                </div>

                {/* Prize highlight */}
                <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy size={16} className="text-yellow-400" />
                      <span className="text-yellow-400 font-bold text-lg">
                        {formatMoneyShort(quiz.prize_pool)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Per winner</p>
                      <p className="text-yellow-400 font-semibold text-sm">
                        {formatMoneyShort(prizePerWinner)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
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
                    {new Date(quiz.expires_at).toLocaleDateString('en-ZA', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Past Quizzes */}
      {pastQuizzes.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Past Draws</h3>
          <div className="space-y-3">
            {pastQuizzes.map((quiz) => (
              <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
                <div className="bg-[#1a1a2e] rounded-xl p-4 opacity-80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-purple-400">{quiz.category}</span>
                    <span className="text-xs text-gray-400 bg-gray-400/10 px-2 py-0.5 rounded-full">
                      {quiz.status === 'settled' ? 'Drawn' : 'Cancelled'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm mb-2">{quiz.question}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Prize: {formatMoneyShort(quiz.prize_pool)}</span>
                    <span>{quiz.participants.toLocaleString()} players</span>
                    {quiz.correct_count > 0 && (
                      <span>{quiz.correct_count.toLocaleString()} correct</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {quizzes.length === 0 && (
        <div className="text-center py-12">
          <HelpCircle size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-500">No quizzes yet</p>
          <p className="text-gray-600 text-sm">Check back soon!</p>
        </div>
      )}
    </div>
  );
}
