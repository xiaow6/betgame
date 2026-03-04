'use client';

import Link from 'next/link';
import {
  User, Wallet, Users, History, Shield, Settings, LogOut,
  ChevronRight, Trophy
} from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort } from '@/lib/constants';

export default function ProfilePage() {
  const { user, bets } = useStore();

  const pendingBets = bets.filter((b) => b.status === 'pending');
  const wonBets = bets.filter((b) => b.status === 'won');

  const menuItems = [
    { icon: Wallet, label: 'Wallet', href: '/wallet', badge: null },
    { icon: Users, label: 'Invite Friends', href: '/invite', badge: 'R5 FREE' },
    { icon: History, label: 'Bet History', href: '/profile/history', badge: `${pendingBets.length} active` },
    { icon: Shield, label: 'Security', href: '/profile/security', badge: null },
    { icon: Settings, label: 'Settings', href: '/profile/settings', badge: null },
  ];

  return (
    <div className="px-4 py-4 space-y-5">
      {/* User Card */}
      <div className="bg-[#1a1a2e] rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
            <User size={28} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-lg">{user?.display_name || 'Guest'}</h2>
            <p className="text-gray-500 text-sm">{user?.phone || 'Not logged in'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[#0f0f23] rounded-xl p-3 text-center">
            <p className="text-green-400 font-bold">{formatMoneyShort(user?.balance ?? 0)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Balance</p>
          </div>
          <div className="bg-[#0f0f23] rounded-xl p-3 text-center">
            <p className="text-yellow-400 font-bold">{formatMoneyShort(user?.free_bet_balance ?? 0)}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Free Bets</p>
          </div>
          <div className="bg-[#0f0f23] rounded-xl p-3 text-center">
            <p className="text-purple-400 font-bold">{wonBets.length}</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Wins</p>
          </div>
        </div>
      </div>

      {/* Active Bets */}
      {pendingBets.length > 0 && (
        <div>
          <h3 className="font-semibold text-sm mb-2">Active Bets</h3>
          <div className="space-y-2">
            {pendingBets.slice(0, 3).map((bet) => (
              <div key={bet.id} className="bg-[#1a1a2e] rounded-xl p-3.5 flex items-center gap-3">
                <div className="bg-orange-500/20 rounded-full p-2">
                  <Trophy size={16} className="text-orange-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium capitalize">{bet.bet_type}</p>
                  <p className="text-xs text-gray-500">
                    Stake: {formatMoneyShort(bet.amount)}
                    {bet.fund_source === 'free_bet' && <span className="text-yellow-500"> (free)</span>}
                  </p>
                </div>
                <span className="text-green-400 text-sm font-bold">
                  {formatMoneyShort(bet.potential_win)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu */}
      <div className="space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href}>
              <div className="flex items-center gap-3 py-3.5 px-1 card-press">
                <Icon size={20} className="text-gray-400" />
                <span className="flex-1 text-sm">{item.label}</span>
                {item.badge && (
                  <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={16} className="text-gray-600" />
              </div>
            </Link>
          );
        })}

        <button className="flex items-center gap-3 py-3.5 px-1 w-full text-left card-press">
          <LogOut size={20} className="text-red-400" />
          <span className="flex-1 text-sm text-red-400">Log Out</span>
        </button>
      </div>
    </div>
  );
}
