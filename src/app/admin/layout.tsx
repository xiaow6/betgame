'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Calendar, Users,
  Wallet, Shield, ArrowLeft, Tv, FlaskConical
} from 'lucide-react';

const adminNav = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/events', label: 'Events', icon: Calendar },
  { href: '/admin/quizzes', label: 'TV Grand Prize', icon: Tv },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/finance', label: 'Finance', icon: Wallet },
  { href: '/admin/risk', label: 'Risk Control', icon: Shield },
  { href: '/admin/test', label: 'Test', icon: FlaskConical },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#0a0a1a]">
      {/* Top bar */}
      <div className="bg-[#1a1a2e] border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-white">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="font-bold text-base text-white">Admin Panel</h1>
        </div>
        <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">ADMIN</span>
      </div>

      {/* Horizontal nav - scrollable on mobile */}
      <div className="bg-[#1a1a2e] border-b border-gray-800 overflow-x-auto no-scrollbar">
        <div className="flex min-w-max px-2">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-green-400 text-green-400'
                    : 'border-transparent text-gray-500'
                }`}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {children}
      </div>
    </div>
  );
}
