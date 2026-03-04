'use client';

import { TrendingUp, Users, Trophy, Wallet, AlertTriangle } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';

export default function AdminDashboard() {
  // Mock admin data
  const stats = {
    totalUsers: 1247,
    activeToday: 312,
    totalBetsToday: 4521,
    volumeToday: 89500000, // R895,000
    platformRevenue: 8950000, // R89,500
    pendingPayouts: 2340000,
    activeEvents: 8,
    activeQuizzes: 5,
  };

  const alerts = [
    { type: 'warning', msg: 'Event "Chiefs vs Pirates" has only 6 bettors (min: 10)' },
    { type: 'info', msg: 'Quiz "AFCON Winner" expires in 2 hours' },
  ];

  const recentSettlements = [
    { event: 'Springboks vs All Blacks', pool: 80000000, rake: 8000000, payout: 72000000, profit: 8000000, variance: 0 },
    { event: 'Quiz: Ballon d\'Or', pool: 32000000, rake: 3200000, payout: 28800000, profit: 3200000, variance: 0 },
  ];

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Users Today" value={stats.activeToday.toString()} sub={`${stats.totalUsers} total`} color="text-blue-400" />
        <StatCard icon={Trophy} label="Bets Today" value={stats.totalBetsToday.toString()} sub={`${stats.activeEvents} events`} color="text-green-400" />
        <StatCard icon={TrendingUp} label="Volume Today" value={formatMoneyShort(stats.volumeToday)} sub="all events" color="text-purple-400" />
        <StatCard icon={Wallet} label="Revenue Today" value={formatMoneyShort(stats.platformRevenue)} sub={`${formatMoneyShort(stats.pendingPayouts)} pending`} color="text-yellow-400" />
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Alerts</h3>
          {alerts.map((alert, i) => (
            <div key={i} className={`rounded-xl p-3 flex items-start gap-2 text-sm ${
              alert.type === 'warning' ? 'bg-yellow-500/10 text-yellow-300' : 'bg-blue-500/10 text-blue-300'
            }`}>
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              {alert.msg}
            </div>
          ))}
        </div>
      )}

      {/* Recent Settlements */}
      <div>
        <h3 className="font-semibold text-sm mb-3">Recent Settlements</h3>
        <div className="space-y-2">
          {recentSettlements.map((s, i) => (
            <div key={i} className="bg-[#1a1a2e] rounded-xl p-4">
              <p className="font-medium text-sm mb-2">{s.event}</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Pool:</span>{' '}
                  <span className="text-white">{formatMoneyShort(s.pool)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Rake:</span>{' '}
                  <span className="text-green-400">{formatMoneyShort(s.rake)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Payout:</span>{' '}
                  <span className="text-white">{formatMoneyShort(s.payout)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Profit:</span>{' '}
                  <span className="text-green-400 font-bold">{formatMoneyShort(s.profit)}</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-gray-800">
                <span className={`text-xs ${s.variance === 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Variance: {formatMoneyShort(s.variance)} {s.variance === 0 ? '✓' : '⚠'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Reconciliation */}
      <div className="bg-[#1a1a2e] rounded-xl p-4">
        <h3 className="font-semibold text-sm mb-3">Daily Reconciliation</h3>
        <div className="space-y-2 text-sm">
          <Row label="Total Deposits" value={formatMoneyShort(15000000)} color="text-green-400" />
          <Row label="Total Withdrawals" value={formatMoneyShort(8500000)} color="text-red-400" />
          <Row label="Total Bets Placed" value={formatMoneyShort(89500000)} />
          <Row label="Total Payouts" value={formatMoneyShort(80550000)} />
          <Row label="Platform Revenue" value={formatMoneyShort(8950000)} color="text-green-400" />
          <Row label="Free Bets Issued" value={formatMoneyShort(125000)} color="text-yellow-400" />
          <div className="border-t border-gray-800 pt-2 mt-2">
            <Row label="System Balance Check" value="✓ Balanced" color="text-green-400" bold />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: typeof Users; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`font-bold text-xl ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-600 mt-0.5">{sub}</p>
    </div>
  );
}

function Row({ label, value, color = 'text-white', bold = false }: {
  label: string; value: string; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`${color} ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}
