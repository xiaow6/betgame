'use client';

import { useState } from 'react';
import { Search, User, Shield, Ban, Eye } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';

// Mock users
const mockUsers = [
  { id: '1', phone: '+27812345678', name: 'Player1', balance: 15000, free_bet: 500, bets: 12, status: 'active' as const, joined: '2026-03-01' },
  { id: '2', phone: '+27721234567', name: 'Player2', balance: 8500, free_bet: 0, bets: 8, status: 'active' as const, joined: '2026-03-01' },
  { id: '3', phone: '+27831234567', name: 'Player3', balance: 45000, free_bet: 1000, bets: 35, status: 'active' as const, joined: '2026-02-28' },
  { id: '4', phone: '+27611234567', name: 'SusUser', balance: 125000, free_bet: 0, bets: 89, status: 'active' as const, joined: '2026-02-25' },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const filtered = mockUsers.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.phone.includes(search)
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <h2 className="font-bold">User Management</h2>

      {/* Search */}
      <div className="flex items-center bg-[#1a1a2e] rounded-xl px-3 gap-2">
        <Search size={16} className="text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="flex-1 bg-transparent py-3 text-sm text-white outline-none"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#1a1a2e] rounded-xl p-3 text-center">
          <p className="text-blue-400 font-bold text-lg">{mockUsers.length}</p>
          <p className="text-[10px] text-gray-500">Total</p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 text-center">
          <p className="text-green-400 font-bold text-lg">
            {mockUsers.filter(u => u.status === 'active').length}
          </p>
          <p className="text-[10px] text-gray-500">Active</p>
        </div>
        <div className="bg-[#1a1a2e] rounded-xl p-3 text-center">
          <p className="text-yellow-400 font-bold text-lg">
            {formatMoneyShort(mockUsers.reduce((s, u) => s + u.balance, 0))}
          </p>
          <p className="text-[10px] text-gray-500">Total Balance</p>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-2">
        {filtered.map((user) => (
          <div key={user.id} className="bg-[#1a1a2e] rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shrink-0">
                <User size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{user.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                    user.status === 'active' ? 'bg-green-400/10 text-green-400' : 'bg-red-400/10 text-red-400'
                  }`}>{user.status}</span>
                </div>
                <p className="text-xs text-gray-500">{user.phone}</p>
              </div>
              <div className="text-right">
                <p className="text-green-400 font-bold text-sm">{formatMoneyShort(user.balance)}</p>
                {user.free_bet > 0 && (
                  <p className="text-yellow-400 text-[10px]">+{formatMoneyShort(user.free_bet)}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
              <span>{user.bets} bets</span>
              <span>Joined {user.joined}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-3">
              <button className="flex-1 bg-blue-500/10 text-blue-400 py-2 rounded-lg text-xs flex items-center justify-center gap-1">
                <Eye size={12} /> View
              </button>
              <button className="flex-1 bg-yellow-500/10 text-yellow-400 py-2 rounded-lg text-xs flex items-center justify-center gap-1">
                <Shield size={12} /> Freeze
              </button>
              <button className="flex-1 bg-red-500/10 text-red-400 py-2 rounded-lg text-xs flex items-center justify-center gap-1">
                <Ban size={12} /> Ban
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
