'use client';

import { useState } from 'react';
import { Tv, Play, Trophy, Users, Shield, Clock } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';

interface Draw {
  id: string;
  title: string;
  status: 'pending' | 'live' | 'drawing' | 'completed';
  prize_amount: number;
  total_eligible: number;
  winner_count: number;
  participants: DrawParticipant[];
  winners: DrawParticipant[];
  audit_log: AuditEntry[];
  scheduled_at: string;
}

interface DrawParticipant {
  id: string;
  display_name_masked: string;
  bet_amount: number;
  is_winner: boolean;
  prize_amount?: number;
  position?: number;
}

interface AuditEntry {
  action: string;
  timestamp: string;
  details: string;
}

const mockDraws: Draw[] = [
  {
    id: 'draw-001',
    title: 'Man United vs Liverpool - Lucky Draw',
    status: 'completed',
    prize_amount: 500000,
    total_eligible: 137,
    winner_count: 3,
    participants: [
      { id: 'p1', display_name_masked: 'Th***do', bet_amount: 5000, is_winner: true, prize_amount: 250000, position: 1 },
      { id: 'p2', display_name_masked: 'Si***lo', bet_amount: 3000, is_winner: true, prize_amount: 150000, position: 2 },
      { id: 'p3', display_name_masked: 'Ma***wa', bet_amount: 2000, is_winner: true, prize_amount: 100000, position: 3 },
      { id: 'p4', display_name_masked: 'Jo***es', bet_amount: 4000, is_winner: false },
      { id: 'p5', display_name_masked: 'Pr***ce', bet_amount: 1500, is_winner: false },
    ],
    winners: [],
    audit_log: [
      { action: 'created', timestamp: '2026-03-03T14:00:00Z', details: 'Draw created by admin' },
      { action: 'started', timestamp: '2026-03-03T19:30:00Z', details: 'Draw started on live TV' },
      { action: 'winner_selected', timestamp: '2026-03-03T19:31:00Z', details: 'Winner 1: Th***do (seed: 0xa3f2b1)' },
      { action: 'winner_selected', timestamp: '2026-03-03T19:31:30Z', details: 'Winner 2: Si***lo (seed: 0xb4c3d2)' },
      { action: 'winner_selected', timestamp: '2026-03-03T19:32:00Z', details: 'Winner 3: Ma***wa (seed: 0xc5d4e3)' },
      { action: 'prize_paid', timestamp: '2026-03-03T19:32:30Z', details: 'All prizes credited to winners' },
      { action: 'completed', timestamp: '2026-03-03T19:33:00Z', details: 'Draw completed' },
    ],
    scheduled_at: '2026-03-03T19:30:00Z',
  },
  {
    id: 'draw-002',
    title: 'Chiefs vs Pirates - Halftime Draw',
    status: 'pending',
    prize_amount: 300000,
    total_eligible: 0,
    winner_count: 1,
    participants: [],
    winners: [],
    audit_log: [
      { action: 'created', timestamp: '2026-03-03T10:00:00Z', details: 'Draw created by admin' },
    ],
    scheduled_at: '2026-03-04T15:45:00Z',
  },
];

export default function AdminDrawsPage() {
  const [draws] = useState(mockDraws);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDraw, setSelectedDraw] = useState<string | null>(null);

  const viewDraw = draws.find(d => d.id === selectedDraw);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Tv size={20} className="text-purple-400" />
          <h2 className="font-bold">TV Live Draws</h2>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
        >
          <Play size={14} /> New Draw
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Create TV Draw</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Title</label>
            <input className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" placeholder="e.g. Halftime Lucky Draw" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Linked Event/Quiz</label>
            <select className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none">
              <option>Man United vs Liverpool</option>
              <option>Chiefs vs Pirates</option>
              <option>Quiz: AFCON Winner</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prize Amount (R)</label>
              <input type="number" defaultValue={5000} className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Winner Count</label>
              <input type="number" defaultValue={1} className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Draw Type</label>
            <select className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none">
              <option value="random">Random (equal chance)</option>
              <option value="weighted">Weighted (by bet amount)</option>
              <option value="top_bettors">Top Bettors</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">Cancel</button>
            <button className="flex-1 bg-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold">Create Draw</button>
          </div>
        </div>
      )}

      {/* Draw Detail */}
      {viewDraw && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{viewDraw.title}</h3>
            <button onClick={() => setSelectedDraw(null)} className="text-xs text-gray-500">Close</button>
          </div>

          {/* Participants with masked names */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Participants (masked for TV)</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {viewDraw.participants.map((p) => (
                <div key={p.id} className={`flex items-center justify-between text-xs py-1.5 px-2 rounded ${
                  p.is_winner ? 'bg-green-500/10' : ''
                }`}>
                  <div className="flex items-center gap-2">
                    {p.is_winner && <Trophy size={12} className="text-yellow-400" />}
                    <span className={p.is_winner ? 'text-green-400 font-medium' : 'text-gray-400'}>
                      {p.display_name_masked}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-gray-500">Bet: {formatMoneyShort(p.bet_amount)}</span>
                    {p.prize_amount && (
                      <span className="text-green-400 font-bold ml-2">Won: {formatMoneyShort(p.prize_amount)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Log */}
          <div>
            <div className="flex items-center gap-1 mb-2">
              <Shield size={12} className="text-blue-400" />
              <p className="text-xs text-gray-500">Audit Log</p>
            </div>
            <div className="space-y-1 bg-[#0f0f23] rounded-lg p-3">
              {viewDraw.audit_log.map((log, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px]">
                  <span className="text-gray-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString('en-ZA')}
                  </span>
                  <span className="text-blue-400 font-mono shrink-0">[{log.action}]</span>
                  <span className="text-gray-400">{log.details}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {viewDraw.status === 'pending' && (
            <button className="w-full bg-purple-500 text-white py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2">
              <Play size={16} /> Start Live Draw
            </button>
          )}
        </div>
      )}

      {/* Draws List */}
      <div className="space-y-3">
        {draws.map((draw) => (
          <button
            key={draw.id}
            onClick={() => setSelectedDraw(draw.id === selectedDraw ? null : draw.id)}
            className="w-full bg-[#1a1a2e] rounded-xl p-4 text-left card-press"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full">
                {draw.status}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock size={10} />
                {new Date(draw.scheduled_at).toLocaleDateString('en-ZA', {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                })}
              </span>
            </div>
            <p className="font-medium text-sm">{draw.title}</p>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Trophy size={10} className="text-yellow-400" />
                Prize: {formatMoneyShort(draw.prize_amount)}
              </span>
              <span className="flex items-center gap-1">
                <Users size={10} />
                {draw.total_eligible} eligible
              </span>
              <span>{draw.winner_count} winner{draw.winner_count > 1 ? 's' : ''}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
