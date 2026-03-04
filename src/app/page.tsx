'use client';

import Link from 'next/link';
import { ChevronRight, Users, Trophy, HelpCircle, Flame } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort } from '@/lib/constants';

export default function HomePage() {
  const { events, quizzes, user } = useStore();
  const upcomingEvents = events.filter((e) => e.status === 'upcoming').slice(0, 3);
  const activeQuizzes = quizzes.filter((q) => q.status === 'active').slice(0, 2);

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Invite Banner */}
      <Link href="/invite" className="block">
        <div className="bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl p-4 card-press">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-bold text-base">Invite Friends</p>
              <p className="text-green-100 text-sm mt-0.5">
                You & your friend each get <span className="font-bold text-white">R5 FREE</span>
              </p>
            </div>
            <div className="bg-white/20 rounded-full p-2">
              <Users size={24} className="text-white" />
            </div>
          </div>
        </div>
      </Link>

      {/* Quick Stats */}
      {user && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#1a1a2e] rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold text-lg">{formatMoneyShort(user.balance)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Balance</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-3 text-center">
            <p className="text-yellow-400 font-bold text-lg">{formatMoneyShort(user.free_bet_balance)}</p>
            <p className="text-gray-500 text-xs mt-0.5">Free Bets</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-xl p-3 text-center">
            <p className="text-purple-400 font-bold text-lg">{user.referral_code}</p>
            <p className="text-gray-500 text-xs mt-0.5">Your Code</p>
          </div>
        </div>
      )}

      {/* Hot Events */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Flame size={18} className="text-orange-500" />
            <h2 className="font-bold text-base">Hot Events</h2>
          </div>
          <Link href="/betting" className="text-green-400 text-sm flex items-center gap-0.5">
            All <ChevronRight size={14} />
          </Link>
        </div>
        <div className="space-y-3">
          {upcomingEvents.map((event) => (
            <Link key={event.id} href={`/betting/${event.id}`} className="block">
              <div className="bg-[#1a1a2e] rounded-xl p-4 card-press">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{event.category}</span>
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    {event.status}
                  </span>
                </div>
                <p className="font-semibold text-sm">{event.home_team} vs {event.away_team}</p>
                <p className="text-gray-500 text-xs mt-1">{event.title}</p>
                <div className="flex gap-2 mt-3">
                  {event.options.map((opt) => (
                    <div key={opt.id} className="flex-1 bg-[#0f0f23] rounded-lg p-2 text-center">
                      <p className="text-xs text-gray-400 truncate">{opt.label}</p>
                      <p className="text-green-400 font-bold text-sm mt-0.5">{opt.odds.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Trophy size={12} />
                  <span>Pool: {formatMoneyShort(event.total_pool)}</span>
                  <span>·</span>
                  <span>{event.options.reduce((sum, o) => sum + o.bet_count, 0)} bets</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quiz Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HelpCircle size={18} className="text-purple-400" />
            <h2 className="font-bold text-base">Quiz Games</h2>
          </div>
          <Link href="/quiz" className="text-green-400 text-sm flex items-center gap-0.5">
            All <ChevronRight size={14} />
          </Link>
        </div>
        <div className="space-y-3">
          {activeQuizzes.map((quiz) => (
            <Link key={quiz.id} href={`/quiz/${quiz.id}`} className="block">
              <div className="bg-[#1a1a2e] rounded-xl p-4 card-press">
                <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                  {quiz.category}
                </span>
                <p className="font-semibold text-sm mt-2">{quiz.question}</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {quiz.options.map((opt) => (
                    <div key={opt.id} className="bg-[#0f0f23] rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-300 truncate">{opt.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className="text-yellow-400 font-semibold">Prize: {formatMoneyShort(quiz.prize_pool)}</span>
                  <span>·</span>
                  <span>Entry: {formatMoneyShort(quiz.entry_fee)}</span>
                  <span>·</span>
                  <span>{quiz.participants.toLocaleString()} joined</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
