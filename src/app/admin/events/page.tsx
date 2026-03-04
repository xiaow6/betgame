'use client';

import { useState } from 'react';
import { Plus, Play, XCircle, CheckCircle, Trophy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort, EVENT_CATEGORIES } from '@/lib/constants';
import type { EventCategory } from '@/types';

export default function AdminEventsPage() {
  const { events } = useStore();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Manage Events</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-green-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
        >
          <Plus size={14} /> New Event
        </button>
      </div>

      {/* Create Form */}
      {showCreate && <CreateEventForm onClose={() => setShowCreate(false)} />}

      {/* Events List */}
      <div className="space-y-3">
        {events.map((event) => {
          const totalBets = event.options.reduce((sum, o) => sum + o.bet_count, 0);
          return (
            <div key={event.id} className="bg-[#1a1a2e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500 uppercase">{event.category}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  event.status === 'upcoming' ? 'text-green-400 bg-green-400/10' :
                  event.status === 'live' ? 'text-red-400 bg-red-400/10' :
                  event.status === 'settled' ? 'text-blue-400 bg-blue-400/10' :
                  'text-gray-400 bg-gray-400/10'
                }`}>
                  {event.status}
                </span>
              </div>

              <p className="font-semibold text-sm">{event.home_team} vs {event.away_team}</p>

              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                  <span className="text-gray-500">Pool:</span>{' '}
                  <span>{formatMoneyShort(event.total_pool)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Bets:</span>{' '}
                  <span>{totalBets}</span>
                </div>
                <div>
                  <span className="text-gray-500">Rake:</span>{' '}
                  <span className="text-green-400">{event.rake_percent}%</span>
                </div>
              </div>

              {/* Option distribution */}
              <div className="mt-2 space-y-1">
                {event.options.map((opt) => {
                  const pct = event.total_pool > 0
                    ? Math.round((opt.total_amount / event.total_pool) * 100) : 0;
                  return (
                    <div key={opt.id} className="flex items-center gap-2 text-xs">
                      <span className="w-20 truncate text-gray-400">{opt.label}</span>
                      <div className="flex-1 bg-[#0f0f23] rounded-full h-2 overflow-hidden">
                        <div className="bg-green-500/50 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-500 w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Min players warning */}
              {totalBets < event.min_players && event.status === 'upcoming' && (
                <p className="text-xs text-yellow-400 mt-2">
                  ⚠ Only {totalBets}/{event.min_players} bettors - may need to cancel
                </p>
              )}

              {/* Actions */}
              {event.status === 'upcoming' && (
                <div className="flex gap-2 mt-3">
                  <button className="flex-1 bg-blue-500/20 text-blue-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                    <Play size={12} /> Go Live
                  </button>
                  <button className="flex-1 bg-red-500/20 text-red-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                    <XCircle size={12} /> Cancel
                  </button>
                </div>
              )}
              {event.status === 'live' && (
                <div className="flex gap-2 mt-3">
                  {event.options.map((opt) => (
                    <button
                      key={opt.id}
                      className="flex-1 bg-green-500/20 text-green-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                    >
                      <CheckCircle size={12} /> {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreateEventForm({ onClose }: { onClose: () => void }) {
  const [category, setCategory] = useState<EventCategory>('soccer');

  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-3">
      <h3 className="font-semibold text-sm">Create New Event</h3>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as EventCategory)}
          className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none"
        >
          {EVENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Home Team</label>
          <input className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" placeholder="Home" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Away Team</label>
          <input className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" placeholder="Away" />
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 block mb-1">Title</label>
        <input className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" placeholder="e.g. Premier League" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Rake %</label>
          <input type="number" defaultValue={10} className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-1">Min Players</label>
          <input type="number" defaultValue={10} className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm font-medium">
          Cancel
        </button>
        <button className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-semibold">
          Create Event
        </button>
      </div>
    </div>
  );
}
