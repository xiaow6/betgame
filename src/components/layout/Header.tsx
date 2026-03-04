'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort } from '@/lib/constants';

const pageTitles: Record<string, string> = {
  '/': 'BetGame',
  '/betting': 'Sports Betting',
  '/quiz': 'TV Grand Prize',
  '/wallet': 'Wallet',
  '/profile': 'My Account',
  '/invite': 'Invite Friends',
};

export default function Header() {
  const pathname = usePathname();
  const user = useStore((s) => s.user);

  // Hide on admin and auth pages
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/auth')) return null;

  const title = Object.entries(pageTitles).find(([path]) => {
    if (path === '/') return pathname === '/';
    return pathname?.startsWith(path);
  })?.[1] || 'BetGame';

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1a1a2e] border-b border-gray-800 safe-top">
      <div className="max-w-lg mx-auto flex items-center justify-between px-4 h-14">
        <h1 className="text-lg font-bold text-white">{title}</h1>

        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-1.5 bg-green-500/10 px-3 py-1 rounded-full">
              <span className="text-green-400 text-sm font-semibold">
                {formatMoneyShort(user.balance)}
              </span>
              {user.free_bet_balance > 0 && (
                <span className="text-yellow-400 text-xs">
                  +{formatMoneyShort(user.free_bet_balance)}
                </span>
              )}
            </div>
          )}
          <button className="relative text-gray-400 active:text-white p-1">
            <Bell size={20} />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
}
