'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Trophy, Filter } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort, EVENT_CATEGORIES } from '@/lib/constants';
import type { EventCategory } from '@/types';

export default function BettingPage() {
  const { events } = useStore();
  const [activeCategory, setActiveCategory] = useState<EventCategory | 'all'>('all');

  const filtered = activeCategory === 'all'
    ? events
    : events.filter((e) => e.category === activeCategory);

  return (
    <div className="px-4 py-4">
      {/* Category Filter - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
        <button
          onClick={() => setActiveCategory('all')}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeCategory === 'all'
              ? 'bg-green-500 text-white'
              : 'bg-[#1a1a2e] text-gray-400'
          }`}
        >
          All
        </button>
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat.value
                ? 'bg-green-500 text-white'
                : 'bg-[#1a1a2e] text-gray-400'
            }`}
          >
            {cat.icon} {cat.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-3 mt-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <Filter size={40} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-500">No events in this category</p>
          </div>
        ) : (
          filtered.map((event) => (
            <Link key={event.id} href={`/betting/${event.id}`} className="block">
              <div className="bg-[#1a1a2e] rounded-xl p-4 card-press">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500 uppercase tracking-wider">{event.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    event.status === 'live'
                      ? 'text-red-400 bg-red-400/10'
                      : 'text-green-400 bg-green-400/10'
                  }`}>
                    {event.status === 'live' ? 'LIVE' : event.status}
                  </span>
                </div>

                <p className="font-semibold">{event.home_team} vs {event.away_team}</p>
                <p className="text-gray-500 text-xs mt-0.5">{event.title}</p>

                <div className="flex gap-2 mt-3">
                  {event.options.map((opt) => (
                    <div key={opt.id} className="flex-1 bg-[#0f0f23] rounded-lg p-2.5 text-center border border-transparent hover:border-green-500/30">
                      <p className="text-xs text-gray-400 truncate">{opt.label}</p>
                      <p className="text-green-400 font-bold mt-0.5">{opt.odds.toFixed(2)}</p>
                      <p className="text-[10px] text-gray-600 mt-0.5">{opt.bet_count} bets</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Trophy size={12} />
                    <span>Pool: {formatMoneyShort(event.total_pool)}</span>
                  </div>
                  <span>
                    {new Date(event.start_time).toLocaleDateString('en-ZA', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
