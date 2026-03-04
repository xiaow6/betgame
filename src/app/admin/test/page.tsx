'use client';

import { useState, useCallback } from 'react';
import { FlaskConical, Play, CheckCircle, XCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';
import {
  generateTestRound,
  settleEvent,
  validateSettlement,
  type SettlementResult,
} from '@/lib/settlement';

interface TestRound {
  round: number;
  result: SettlementResult;
  validationErrors: string[];
  passed: boolean;
  timestamp: string;
}

export default function AdminTestPage() {
  const [rounds, setRounds] = useState<TestRound[]>([]);
  const [running, setRunning] = useState(false);
  const [currentRound, setCurrentRound] = useState(0);
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  const runAllTests = useCallback(async () => {
    setRunning(true);
    setRounds([]);
    setCurrentRound(0);

    const newRounds: TestRound[] = [];

    for (let i = 1; i <= 10; i++) {
      setCurrentRound(i);

      // Generate test data
      const { event, bets, users, expectedWinningOptionId } = generateTestRound(i);

      // Run settlement
      const result = settleEvent(event, bets, users, expectedWinningOptionId);

      // Validate
      const isCancelTest = i === 5;
      const validationErrors = validateSettlement(result, isCancelTest);
      const allErrors = [...result.errors, ...validationErrors];

      const testRound: TestRound = {
        round: i,
        result,
        validationErrors: allErrors,
        passed: allErrors.length === 0 && result.passed,
        timestamp: new Date().toISOString(),
      };

      newRounds.push(testRound);
      setRounds([...newRounds]);

      // Small delay for visual effect
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setRunning(false);
  }, []);

  const allPassed = rounds.length === 10 && rounds.every(r => r.passed);
  const totalProfit = rounds.reduce((sum, r) => sum + r.result.platform_profit, 0);
  const totalPool = rounds.reduce((sum, r) => sum + r.result.total_pool, 0);
  const totalPayout = rounds.reduce((sum, r) => sum + r.result.total_payout, 0);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical size={20} className="text-blue-400" />
          <h2 className="font-bold">Settlement Test Engine</h2>
        </div>
        <button
          onClick={runAllTests}
          disabled={running}
          className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${
            running ? 'bg-gray-700 text-gray-400' : 'bg-blue-500 text-white'
          }`}
        >
          {running ? (
            <><RotateCcw size={14} className="animate-spin" /> Running {currentRound}/10</>
          ) : rounds.length > 0 ? (
            <><RotateCcw size={14} /> Re-run All</>
          ) : (
            <><Play size={14} /> Run 10 Rounds</>
          )}
        </button>
      </div>

      {/* Description */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
        <p>Tests 10 settlement rounds with varied scenarios:</p>
        <ul className="mt-1 space-y-0.5 text-blue-400">
          <li>- Sport events (rounds 1,2,4,7,8,10)</li>
          <li>- Quiz events (rounds 3,6,9)</li>
          <li>- Cancellation test: round 5 (below min players)</li>
          <li>- Random bet distribution, 15-35 users per round</li>
          <li>- Validates: pool math, payout limits, variance, profit</li>
        </ul>
      </div>

      {/* Summary */}
      {rounds.length > 0 && (
        <div className={`rounded-xl p-4 ${allPassed ? 'bg-green-500/10 border border-green-500/20' : rounds.some(r => !r.passed) ? 'bg-red-500/10 border border-red-500/20' : 'bg-[#1a1a2e]'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm">
              {allPassed ? 'All 10 Rounds Passed!' : running ? `Running... ${currentRound}/10` : `${rounds.filter(r => r.passed).length}/10 Passed`}
            </h3>
            {allPassed && <CheckCircle size={20} className="text-green-400" />}
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-500">Total Volume</span>
              <p className="text-white font-bold">{formatMoneyShort(totalPool)}</p>
            </div>
            <div>
              <span className="text-gray-500">Total Payouts</span>
              <p className="text-white font-bold">{formatMoneyShort(totalPayout)}</p>
            </div>
            <div>
              <span className="text-gray-500">Platform Profit</span>
              <p className="text-green-400 font-bold">{formatMoneyShort(totalProfit)}</p>
            </div>
            <div>
              <span className="text-gray-500">Avg Margin</span>
              <p className="text-green-400 font-bold">
                {totalPool > 0 ? ((totalProfit / totalPool) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Round Results */}
      <div className="space-y-2">
        {rounds.map((round) => (
          <div key={round.round} className="bg-[#1a1a2e] rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedRound(expandedRound === round.round ? null : round.round)}
              className="w-full p-4 flex items-center gap-3 text-left"
            >
              {round.passed ? (
                <CheckCircle size={18} className="text-green-400 shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-400 shrink-0" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium">
                  Round {round.round}: {round.result.event_title}
                </p>
                <div className="flex gap-3 text-[10px] text-gray-500 mt-0.5">
                  <span>Pool: {formatMoneyShort(round.result.total_pool)}</span>
                  <span>Bets: {round.result.bets_processed}</span>
                  <span className="text-green-400">Profit: {formatMoneyShort(round.result.platform_profit)}</span>
                  {round.result.refunds_count > 0 && <span className="text-yellow-400">Refunds: {round.result.refunds_count}</span>}
                </div>
              </div>
              {expandedRound === round.round ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>

            {expandedRound === round.round && (
              <div className="px-4 pb-4 space-y-3">
                {/* Reconciliation */}
                <div className="bg-[#0f0f23] rounded-lg p-3 text-xs space-y-1">
                  <ReconRow label="Total Pool" value={formatMoneyShort(round.result.total_pool)} />
                  <ReconRow label="Rake (10%)" value={formatMoneyShort(round.result.rake)} color="text-green-400" />
                  <ReconRow label="Prize Pool" value={formatMoneyShort(round.result.prize_pool)} />
                  <ReconRow label="Total Payout" value={formatMoneyShort(round.result.total_payout)} />
                  <ReconRow label="Platform Profit" value={formatMoneyShort(round.result.platform_profit)} color="text-green-400" />
                  <ReconRow label="Variance" value={`${round.result.variance} cents`} color={round.result.variance === 0 ? 'text-green-400' : 'text-yellow-400'} />
                  <div className="border-t border-gray-800 pt-1 mt-1">
                    <ReconRow label="Winners" value={round.result.winners_count.toString()} />
                    <ReconRow label="Losers" value={round.result.losers_count.toString()} />
                    <ReconRow label="Refunds" value={round.result.refunds_count.toString()} />
                  </div>
                </div>

                {/* Option Breakdown */}
                <div className="bg-[#0f0f23] rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 mb-2">Options</p>
                  {round.result.options_breakdown.map((opt) => (
                    <div key={opt.option_id} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        {opt.is_winner && <CheckCircle size={10} className="text-green-400" />}
                        <span className={opt.is_winner ? 'text-green-400' : 'text-gray-400'}>{opt.label}</span>
                      </div>
                      <span className="text-gray-500">{opt.bet_count} bets · {formatMoneyShort(opt.total_amount)}</span>
                    </div>
                  ))}
                </div>

                {/* Winner Payouts */}
                {round.result.payout_details.length > 0 && (
                  <div className="bg-[#0f0f23] rounded-lg p-3">
                    <p className="text-[10px] text-gray-500 mb-2">Winner Payouts</p>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {round.result.payout_details.map((pd) => (
                        <div key={pd.bet_id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{pd.user_id.slice(-6)}</span>
                          <span className="text-gray-500">
                            Bet: {formatMoneyShort(pd.bet_amount)}
                            {pd.fund_source === 'free_bet' && <span className="text-yellow-500"> (free)</span>}
                          </span>
                          <span className="text-green-400 font-bold">Won: {formatMoneyShort(pd.payout)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Errors */}
                {round.validationErrors.length > 0 && (
                  <div className="bg-red-500/10 rounded-lg p-3">
                    <p className="text-[10px] text-red-400 mb-1">Errors:</p>
                    {round.validationErrors.map((err, i) => (
                      <p key={i} className="text-xs text-red-300">- {err}</p>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-gray-600">
                  Tested at: {new Date(round.timestamp).toLocaleString('en-ZA')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReconRow({ label, value, color = 'text-white' }: {
  label: string; value: string; color?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className={color}>{value}</span>
    </div>
  );
}
