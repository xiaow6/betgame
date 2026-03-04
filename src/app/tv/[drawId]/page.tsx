'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, Sparkles } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';

// TV Display page - full screen, designed for broadcast overlay
// This page is accessed by the TV production team via iframe or direct URL

interface Participant {
  id: string;
  display_name_masked: string;
  bet_amount: number;
}

interface Winner {
  display_name_masked: string;
  prize_amount: number;
  position: number;
}

type DrawPhase = 'waiting' | 'showing_participants' | 'drawing' | 'reveal' | 'done';

export default function TVDrawPage() {
  const { drawId } = useParams();
  const [phase, setPhase] = useState<DrawPhase>('waiting');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [visibleNames, setVisibleNames] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [currentWinner, setCurrentWinner] = useState<Winner | null>(null);
  const [spinName, setSpinName] = useState('');
  const [title, setTitle] = useState('Lucky Draw');

  // Mock data - will be replaced with API calls
  useEffect(() => {
    const mockParticipants: Participant[] = [
      { id: '1', display_name_masked: 'Th***do', bet_amount: 5000 },
      { id: '2', display_name_masked: 'Si***lo', bet_amount: 3000 },
      { id: '3', display_name_masked: 'Ma***wa', bet_amount: 2000 },
      { id: '4', display_name_masked: 'Jo***es', bet_amount: 4000 },
      { id: '5', display_name_masked: 'Pr***ce', bet_amount: 1500 },
      { id: '6', display_name_masked: 'Le***to', bet_amount: 2500 },
      { id: '7', display_name_masked: 'Bu***zi', bet_amount: 3500 },
      { id: '8', display_name_masked: 'No***sa', bet_amount: 1000 },
      { id: '9', display_name_masked: 'Zi***le', bet_amount: 6000 },
      { id: '10', display_name_masked: 'Ka***lo', bet_amount: 4500 },
    ];
    setParticipants(mockParticipants);
    setTitle(`Lucky Draw #${(drawId as string)?.slice(-3) || '001'}`);
  }, [drawId]);

  // Scrolling names animation
  useEffect(() => {
    if (phase !== 'showing_participants') return;
    let i = 0;
    const interval = setInterval(() => {
      setVisibleNames(participants.slice(0, Math.min(i + 1, participants.length)));
      i++;
      if (i >= participants.length) clearInterval(interval);
    }, 300);
    return () => clearInterval(interval);
  }, [phase, participants]);

  // Spin animation
  useEffect(() => {
    if (phase !== 'drawing') return;
    let count = 0;
    const interval = setInterval(() => {
      const randomP = participants[Math.floor(Math.random() * participants.length)];
      setSpinName(randomP.display_name_masked);
      count++;
      if (count > 30) {
        clearInterval(interval);
        // Reveal winner
        const winner: Winner = {
          display_name_masked: participants[2].display_name_masked,
          prize_amount: 500000,
          position: 1,
        };
        setCurrentWinner(winner);
        setWinners([winner]);
        setPhase('reveal');
      }
    }, 100 + count * 5);
    return () => clearInterval(interval);
  }, [phase, participants]);

  const startDraw = useCallback(() => {
    setPhase('showing_participants');
    setTimeout(() => setPhase('drawing'), participants.length * 300 + 1000);
  }, [participants]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a2e] via-[#0f0f3a] to-[#1a0a2e] flex flex-col items-center justify-center text-white overflow-hidden relative">
      {/* Background particles effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-yellow-400/30 rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Logo */}
      <div className="absolute top-6 left-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-4 py-2 rounded-xl">
          <span className="font-black text-lg">BetGame</span>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-4xl font-black mb-2 text-center bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-gray-400 text-lg mb-8">
        {participants.length} participants
      </p>

      {/* Main Content Area */}
      <div className="w-full max-w-2xl px-8">
        {/* Waiting */}
        {phase === 'waiting' && (
          <div className="text-center">
            <p className="text-2xl text-gray-300 mb-8">Ready to draw...</p>
            <button
              onClick={startDraw}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-xl font-black px-12 py-5 rounded-2xl shadow-lg shadow-yellow-500/30 active:scale-95 transition-transform"
            >
              START DRAW
            </button>
          </div>
        )}

        {/* Showing participants */}
        {phase === 'showing_participants' && (
          <div className="text-center">
            <p className="text-lg text-gray-400 mb-4">Eligible Players</p>
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-hidden">
              {visibleNames.map((p) => (
                <div
                  key={p.id}
                  className="bg-white/5 backdrop-blur rounded-xl px-4 py-3 flex items-center justify-between animate-in"
                  style={{ animation: 'fadeInUp 0.3s ease-out' }}
                >
                  <span className="font-medium">{p.display_name_masked}</span>
                  <span className="text-green-400 text-sm">{formatMoneyShort(p.bet_amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drawing animation */}
        {phase === 'drawing' && (
          <div className="text-center">
            <p className="text-lg text-yellow-400 mb-6 animate-pulse">Drawing winner...</p>
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-2 border-yellow-500/50 rounded-3xl px-12 py-10 mb-8">
              <p className="text-5xl font-black tracking-wider text-yellow-400 transition-all">
                {spinName}
              </p>
            </div>
            <div className="flex justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-3 h-3 bg-yellow-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Winner Reveal */}
        {phase === 'reveal' && currentWinner && (
          <div className="text-center">
            <div className="mb-6">
              <Sparkles size={48} className="text-yellow-400 mx-auto mb-2 animate-bounce" />
              <p className="text-2xl text-yellow-400 font-bold">WINNER!</p>
            </div>

            <div className="bg-gradient-to-r from-yellow-600/20 to-orange-600/20 border-2 border-yellow-500 rounded-3xl px-12 py-8 mb-6">
              <Trophy size={48} className="text-yellow-400 mx-auto mb-4" />
              <p className="text-5xl font-black text-white mb-4">
                {currentWinner.display_name_masked}
              </p>
              <p className="text-3xl font-bold text-green-400">
                {formatMoneyShort(currentWinner.prize_amount)}
              </p>
            </div>

            <p className="text-gray-400 text-sm">
              Prize has been credited to the winner&apos;s account
            </p>
          </div>
        )}
      </div>

      {/* Ticker bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-3 px-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">BetGame Live Draw</span>
          <span className="text-yellow-400">Download the app and play!</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
