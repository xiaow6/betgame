/**
 * Settlement Engine Test Script
 * Runs 10 rounds of settlement testing and outputs results
 *
 * Usage: npx tsx scripts/test-settlement.ts
 */

import { generateTestRound, settleEvent, validateSettlement } from '../src/lib/settlement';

console.log('===========================================');
console.log('  BetGame Settlement Engine - 10 Round Test');
console.log('===========================================\n');

let allPassed = true;
let totalPool = 0;
let totalPayout = 0;
let totalProfit = 0;

for (let round = 1; round <= 10; round++) {
  const { event, bets, users, expectedWinningOptionId } = generateTestRound(round);
  const result = settleEvent(event, bets, users, expectedWinningOptionId);

  const isCancelTest = round === 5;
  const validationErrors = validateSettlement(result, isCancelTest);
  const allErrors = [...result.errors, ...validationErrors];
  const passed = allErrors.length === 0 && result.passed;

  if (!passed) allPassed = false;

  totalPool += result.total_pool;
  totalPayout += result.total_payout;
  totalProfit += result.platform_profit;

  const status = passed ? '✓ PASS' : '✗ FAIL';
  const poolR = (result.total_pool / 100).toFixed(2);
  const rakeR = (result.rake / 100).toFixed(2);
  const payoutR = (result.total_payout / 100).toFixed(2);
  const profitR = (result.platform_profit / 100).toFixed(2);

  console.log(`Round ${round.toString().padStart(2)}: ${status} | ${result.event_title}`);
  console.log(`  Type: ${event.type} | Bets: ${result.bets_processed} | Pool: R${poolR}`);
  console.log(`  Rake: R${rakeR} | Payout: R${payoutR} | Profit: R${profitR}`);
  console.log(`  Winners: ${result.winners_count} | Losers: ${result.losers_count} | Refunds: ${result.refunds_count}`);
  console.log(`  Variance: ${result.variance} cents`);

  if (allErrors.length > 0) {
    console.log(`  ERRORS:`);
    allErrors.forEach(e => console.log(`    - ${e}`));
  }

  // Verify user balances
  let userBalanceCheck = true;
  for (const [userId, user] of users) {
    if (user.balance < 0) {
      console.log(`  ERROR: User ${userId} has negative balance: ${user.balance}`);
      userBalanceCheck = false;
    }
    if (user.free_bet_balance < 0) {
      console.log(`  ERROR: User ${userId} has negative free bet balance: ${user.free_bet_balance}`);
      userBalanceCheck = false;
    }
  }

  if (userBalanceCheck) {
    console.log(`  User balances: ✓ All non-negative`);
  }

  // Verify pool math (cancelled events have 0 rake/payout - all refunded)
  const poolCheck = isCancelTest
    ? result.refunds_count === bets.length
    : result.rake + result.total_payout + result.variance === result.total_pool;
  const poolMsg = isCancelTest
    ? `Cancelled: all ${result.refunds_count} bets refunded`
    : `rake + payout + variance = pool: ${result.rake} + ${result.total_payout} + ${result.variance} = ${result.rake + result.total_payout + result.variance} vs ${result.total_pool}`;
  console.log(`  Pool math: ${poolCheck ? '✓' : '✗'} (${poolMsg})`);

  console.log('');
}

console.log('===========================================');
console.log('  SUMMARY');
console.log('===========================================');
console.log(`  Total Rounds: 10`);
console.log(`  Passed: ${allPassed ? '10/10 ✓' : 'SOME FAILED ✗'}`);
console.log(`  Total Volume: R${(totalPool / 100).toFixed(2)}`);
console.log(`  Total Payouts: R${(totalPayout / 100).toFixed(2)}`);
console.log(`  Total Profit: R${(totalProfit / 100).toFixed(2)}`);
console.log(`  Avg Margin: ${totalPool > 0 ? ((totalProfit / totalPool) * 100).toFixed(1) : 0}%`);
console.log(`\n  Result: ${allPassed ? '✓ ALL TESTS PASSED' : '✗ SOME TESTS FAILED'}`);
console.log('===========================================');

process.exit(allPassed ? 0 : 1);
