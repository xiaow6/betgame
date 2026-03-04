'use client';

import { useState } from 'react';
import { Calendar, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';

export default function AdminFinancePage() {
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Mock reconciliation data
  const dailyRecon = {
    total_deposits: 15000000,
    total_withdrawals: 8500000,
    total_bets_placed: 89500000,
    total_payouts: 80550000,
    platform_rake: 8950000,
    free_bets_issued: 125000,
    free_bets_used: 85000,
    system_balance_check: true,
    variance: 0,
  };

  const eventRecons = [
    {
      id: 'evt-001',
      title: 'Man United vs Liverpool',
      status: 'settled',
      total_pool: 75000000,
      bet_count: 137,
      rake: 7500000,
      prize_pool: 67500000,
      payout: 67500000,
      profit: 7500000,
      variance: 0,
      winner: 'Liverpool',
      options: [
        { label: 'Man United', bets: 45, amount: 25000000, won: false },
        { label: 'Draw', bets: 30, amount: 18000000, won: false },
        { label: 'Liverpool', bets: 62, amount: 32000000, won: true },
      ],
      anomalies: [],
    },
    {
      id: 'quiz-001',
      title: 'Quiz: AFCON Winner',
      status: 'settled',
      total_pool: 44000000,
      bet_count: 120,
      rake: 4400000,
      prize_pool: 39600000,
      payout: 39600000,
      profit: 4400000,
      variance: 0,
      winner: 'Ivory Coast',
      options: [
        { label: 'Nigeria', bets: 35, amount: 12000000, won: false },
        { label: 'Ivory Coast', bets: 55, amount: 20000000, won: true },
        { label: 'South Africa', bets: 20, amount: 8000000, won: false },
        { label: 'DR Congo', bets: 10, amount: 4000000, won: false },
      ],
      anomalies: [],
    },
  ];

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Period Selector */}
      <div className="flex gap-2">
        {(['today', 'week', 'month'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-xl text-xs font-medium capitalize ${
              period === p ? 'bg-green-500 text-white' : 'bg-[#1a1a2e] text-gray-400'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* System Reconciliation */}
      <div className="bg-[#1a1a2e] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">System Reconciliation</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
            dailyRecon.system_balance_check
              ? 'bg-green-400/10 text-green-400'
              : 'bg-red-400/10 text-red-400'
          }`}>
            {dailyRecon.system_balance_check ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
            {dailyRecon.system_balance_check ? 'Balanced' : 'Mismatch!'}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <ReconRow label="Total Deposits" value={formatMoneyShort(dailyRecon.total_deposits)} color="text-green-400" />
          <ReconRow label="Total Withdrawals" value={formatMoneyShort(dailyRecon.total_withdrawals)} color="text-red-400" />
          <div className="border-t border-gray-800 my-1" />
          <ReconRow label="Total Bets Placed" value={formatMoneyShort(dailyRecon.total_bets_placed)} />
          <ReconRow label="Total Payouts" value={formatMoneyShort(dailyRecon.total_payouts)} />
          <ReconRow label="Platform Rake" value={formatMoneyShort(dailyRecon.platform_rake)} color="text-green-400" />
          <div className="border-t border-gray-800 my-1" />
          <ReconRow label="Free Bets Issued" value={formatMoneyShort(dailyRecon.free_bets_issued)} color="text-yellow-400" />
          <ReconRow label="Free Bets Used" value={formatMoneyShort(dailyRecon.free_bets_used)} color="text-yellow-400" />
          <div className="border-t border-gray-800 my-1 pt-1">
            <ReconRow
              label="Variance"
              value={`${formatMoneyShort(dailyRecon.variance)} ${dailyRecon.variance === 0 ? '✓' : '⚠'}`}
              color={dailyRecon.variance === 0 ? 'text-green-400' : 'text-red-400'}
              bold
            />
          </div>
        </div>
      </div>

      {/* Per-Event Reconciliation */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Event Reconciliation</h3>
          <button className="text-xs text-green-400 flex items-center gap-1">
            <Download size={12} /> Export
          </button>
        </div>

        <div className="space-y-3">
          {eventRecons.map((evt) => (
            <div key={evt.id} className="bg-[#1a1a2e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-medium text-sm">{evt.title}</p>
                <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">
                  {evt.status}
                </span>
              </div>

              {/* Pool breakdown */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                <span className="text-gray-500">Total Pool</span>
                <span className="text-right">{formatMoneyShort(evt.total_pool)}</span>
                <span className="text-gray-500">Bettors</span>
                <span className="text-right">{evt.bet_count}</span>
                <span className="text-gray-500">Rake</span>
                <span className="text-right text-green-400">{formatMoneyShort(evt.rake)}</span>
                <span className="text-gray-500">Prize Pool</span>
                <span className="text-right">{formatMoneyShort(evt.prize_pool)}</span>
                <span className="text-gray-500">Paid Out</span>
                <span className="text-right">{formatMoneyShort(evt.payout)}</span>
                <span className="text-gray-500 font-medium">Profit</span>
                <span className="text-right text-green-400 font-bold">{formatMoneyShort(evt.profit)}</span>
              </div>

              {/* Options breakdown */}
              <div className="bg-[#0f0f23] rounded-lg p-3 mb-2">
                <p className="text-[10px] text-gray-500 mb-2">Option Breakdown</p>
                {evt.options.map((opt, i) => (
                  <div key={i} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      {opt.won && <CheckCircle size={10} className="text-green-400" />}
                      <span className={opt.won ? 'text-green-400 font-medium' : 'text-gray-400'}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-gray-500">
                      {opt.bets} bets · {formatMoneyShort(opt.amount)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Variance */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Variance</span>
                <span className={evt.variance === 0 ? 'text-green-400' : 'text-red-400'}>
                  {formatMoneyShort(evt.variance)} {evt.variance === 0 ? '✓' : '⚠ INVESTIGATE'}
                </span>
              </div>

              {/* Anomalies */}
              {evt.anomalies.length > 0 && (
                <div className="mt-2 bg-red-500/10 rounded-lg p-2">
                  {evt.anomalies.map((a, i) => (
                    <p key={i} className="text-xs text-red-400 flex items-center gap-1">
                      <AlertTriangle size={10} /> {a}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReconRow({ label, value, color = 'text-white', bold = false }: {
  label: string; value: string; color?: string; bold?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={`text-gray-400 ${bold ? 'font-medium' : ''}`}>{label}</span>
      <span className={`${color} ${bold ? 'font-bold' : ''}`}>{value}</span>
    </div>
  );
}
