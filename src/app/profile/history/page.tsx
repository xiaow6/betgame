'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, HelpCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort } from '@/lib/constants';

export default function BetHistoryPage() {
  const router = useRouter();
  const { bets } = useStore();

  return (
    <div className="px-4 py-4">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-gray-400 mb-4">
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      <h2 className="font-bold text-lg mb-4">Bet History</h2>

      <div className="space-y-2">
        {bets.map((bet) => (
          <div key={bet.id} className="bg-[#1a1a2e] rounded-xl p-4 flex items-center gap-3">
            <div className={`rounded-full p-2 ${
              bet.bet_type === 'sport' ? 'bg-green-500/20' : 'bg-purple-500/20'
            }`}>
              {bet.bet_type === 'sport'
                ? <Trophy size={18} className="text-green-400" />
                : <HelpCircle size={18} className="text-purple-400" />
              }
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium capitalize">{bet.bet_type}</p>
              <p className="text-xs text-gray-500">
                {formatMoneyShort(bet.amount)}
                {bet.fund_source === 'free_bet' && <span className="text-yellow-500"> (free)</span>}
              </p>
              <p className="text-[10px] text-gray-600">
                {new Date(bet.created_at).toLocaleString('en-ZA')}
              </p>
            </div>
            <div className="text-right">
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                bet.status === 'pending' ? 'bg-yellow-400/10 text-yellow-400' :
                bet.status === 'won' ? 'bg-green-400/10 text-green-400' :
                bet.status === 'lost' ? 'bg-red-400/10 text-red-400' :
                'bg-gray-400/10 text-gray-400'
              }`}>
                {bet.status}
              </span>
              <p className="text-green-400 text-sm font-bold mt-1">
                {formatMoneyShort(bet.potential_win)}
              </p>
            </div>
          </div>
        ))}

        {bets.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No bets yet
          </div>
        )}
      </div>
    </div>
  );
}
