'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, HelpCircle, Wallet, User } from 'lucide-react';

const tabs = [
  { key: 'home', label: 'Home', href: '/', icon: Home },
  { key: 'betting', label: 'Bet', href: '/betting', icon: Trophy },
  { key: 'quiz', label: 'Quiz', href: '/quiz', icon: HelpCircle },
  { key: 'wallet', label: 'Wallet', href: '/wallet', icon: Wallet },
  { key: 'profile', label: 'Me', href: '/profile', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Hide on admin pages
  if (pathname?.startsWith('/admin')) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a2e] border-t border-gray-800 safe-bottom">
      <div className="max-w-lg mx-auto flex">
        {tabs.map((tab) => {
          const isActive = tab.href === '/'
            ? pathname === '/'
            : pathname?.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.key}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-2 pt-3 transition-colors ${
                isActive
                  ? 'text-green-400'
                  : 'text-gray-500 active:text-gray-300'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="text-[10px] mt-1 font-medium">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
