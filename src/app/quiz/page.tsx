'use client';

import Link from 'next/link';
import { HelpCircle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort } from '@/lib/constants';

export default function QuizPage() {
  const { quizzes } = useStore();

  return (
    <div className="px-4 py-4">
      <div className="space-y-3">
        {quizzes.map((quiz) => (
          <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
            <div className="bg-[#1a1a2e] rounded-xl p-4 card-press">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                  {quiz.category}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  quiz.status === 'active'
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-gray-400 bg-gray-400/10'
                }`}>
                  {quiz.status}
                </span>
              </div>

              <div className="flex items-start gap-3 mb-3">
                <div className="bg-purple-500/20 rounded-full p-2 shrink-0 mt-0.5">
                  <HelpCircle size={18} className="text-purple-400" />
                </div>
                <p className="font-semibold text-sm leading-snug">{quiz.question}</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {quiz.options.map((opt) => (
                  <div key={opt.id} className="bg-[#0f0f23] rounded-lg px-3 py-2.5 text-center">
                    <p className="text-sm text-gray-300 truncate">{opt.label}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{opt.bet_count} picks</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>Pool: {formatMoneyShort(quiz.total_pool)}</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  Ends {new Date(quiz.expires_at).toLocaleDateString('en-ZA', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </Link>
        ))}

        {quizzes.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No active quizzes</p>
            <p className="text-gray-600 text-sm">Check back soon!</p>
          </div>
        )}
      </div>
    </div>
  );
}
