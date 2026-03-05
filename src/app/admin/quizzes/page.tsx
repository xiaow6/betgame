'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, CheckCircle, XCircle, Clock, Send, Tv, Loader2 } from 'lucide-react';
import { formatMoneyShort, formatMoney } from '@/lib/constants';
import type { Quiz, QuizTvMessage } from '@/types';

type TvMessageType = QuizTvMessage['type'];

export default function AdminQuizzesPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [tvLogs, setTvLogs] = useState<QuizTvMessage[]>([]);
  const [showTvPanel, setShowTvPanel] = useState(false);
  const [settling, setSettling] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create form state
  const [newQuestion, setNewQuestion] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newOptions, setNewOptions] = useState('');
  const [newEntryFee, setNewEntryFee] = useState('10');
  const [newPrizePool, setNewPrizePool] = useState('100000');
  const [newWinnerCount, setNewWinnerCount] = useState('100');
  const [newExpiresHours, setNewExpiresHours] = useState('24');

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (data.success) {
        const all = [...(data.data.active || []), ...(data.data.settled || [])];
        setQuizzes(all);
      }
    } catch { /* */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchQuizzes(); }, [fetchQuizzes]);

  async function handleCreate() {
    const options = newOptions.split('\n').filter(Boolean).map(l => l.trim());
    if (!newQuestion || options.length < 2 || creating) return;

    setCreating(true);
    try {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: newQuestion,
          category: newCategory || 'General',
          entry_fee: Math.round(Number(newEntryFee) * 100),
          prize_pool: Math.round(Number(newPrizePool) * 100),
          winner_count: Number(newWinnerCount),
          expires_hours: Number(newExpiresHours),
          options,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setShowCreate(false);
        setNewQuestion('');
        setNewCategory('');
        setNewOptions('');
        setNewEntryFee('10');
        setNewPrizePool('100000');
        setNewWinnerCount('100');
        sendTvMessage(data.data, 'quiz_started');
        await fetchQuizzes();
      }
    } catch { /* */ }
    finally { setCreating(false); }
  }

  async function handleSetCorrectAnswer(quiz: Quiz, optionId: string) {
    if (settling) return;
    setSettling(quiz.id);

    try {
      const res = await fetch(`/api/quizzes/${quiz.id}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correct_option_id: optionId }),
      });

      const data = await res.json();
      if (data.success) {
        const settledQuiz = data.data.quiz;
        sendTvMessage(settledQuiz, 'quiz_answer_reveal');
        setTimeout(() => sendTvMessage(settledQuiz, 'quiz_drawing'), 500);
        setTimeout(() => sendTvMessage(settledQuiz, 'quiz_winners'), 1000);
        await fetchQuizzes();
      }
    } catch { /* */ }
    finally { setSettling(null); }
  }

  async function handleCancel(quizId: string) {
    // TODO: implement cancel API
    setQuizzes(prev => prev.map(q =>
      q.id === quizId ? { ...q, status: 'cancelled' as const } : q
    ));
  }

  function sendTvMessage(quiz: Quiz, type: TvMessageType) {
    const correctOption = quiz.options.find(o => o.id === quiz.correct_option_id);
    const prizePerWinner = quiz.winner_count > 0 ? Math.floor(quiz.prize_pool / quiz.winner_count) : 0;

    const msg: QuizTvMessage = {
      quiz_id: quiz.id,
      type,
      question: quiz.question,
      options: quiz.options.map(o => ({ label: o.label, pick_count: o.pick_count })),
      correct_answer: correctOption?.label,
      participants: quiz.participants,
      correct_count: quiz.correct_count,
      winners: quiz.winners,
      prize_pool: quiz.prize_pool,
      prize_per_winner: prizePerWinner,
      timestamp: new Date().toISOString(),
    };

    setTvLogs(prev => [msg, ...prev]);
    console.log('[TV SYNC]', JSON.stringify(msg, null, 2));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Manage Quizzes</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowTvPanel(!showTvPanel)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 ${
              showTvPanel ? 'bg-blue-500 text-white' : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            <Tv size={14} /> TV Sync
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <Plus size={14} /> New Quiz
          </button>
        </div>
      </div>

      {/* TV Sync Panel */}
      {showTvPanel && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-blue-400 flex items-center gap-2">
              <Tv size={16} /> TV Station Message Log
            </h3>
            <span className="text-[10px] text-gray-500">{tvLogs.length} messages sent</span>
          </div>

          {tvLogs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">
              No messages sent yet. Create a quiz or settle one to trigger TV messages.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {tvLogs.map((msg, i) => (
                <div key={i} className="bg-[#0f0f23] rounded-lg p-3 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold ${
                      msg.type === 'quiz_winners' ? 'text-yellow-400' :
                      msg.type === 'quiz_answer_reveal' ? 'text-green-400' :
                      msg.type === 'quiz_drawing' ? 'text-purple-400' :
                      'text-blue-400'
                    }`}>
                      {msg.type.replace('quiz_', '').replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-gray-600">
                      {new Date(msg.timestamp).toLocaleTimeString('en-ZA')}
                    </span>
                  </div>
                  <p className="text-gray-400 truncate">{msg.question}</p>
                  {msg.correct_answer && (
                    <p className="text-green-400 mt-1">Answer: {msg.correct_answer}</p>
                  )}
                  {msg.winners && msg.winners.length > 0 && (
                    <p className="text-yellow-400 mt-1">
                      {msg.winners.length} winners &middot; {formatMoney(msg.prize_per_winner ?? 0)} each
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Quiz Form */}
      {showCreate && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Create Quiz (Lottery Mode)</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Question</label>
            <input
              value={newQuestion}
              onChange={e => setNewQuestion(e.target.value)}
              className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              placeholder="Enter your question"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <input
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              placeholder="e.g. Soccer Trivia"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Options (one per line)</label>
            <textarea
              value={newOptions}
              onChange={e => setNewOptions(e.target.value)}
              className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none h-24"
              placeholder={"Option A\nOption B\nOption C\nOption D"}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Entry Fee (R)</label>
              <input
                type="number"
                value={newEntryFee}
                onChange={e => setNewEntryFee(e.target.value)}
                className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Prize Pool (R)</label>
              <input
                type="number"
                value={newPrizePool}
                onChange={e => setNewPrizePool(e.target.value)}
                className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Winner Count</label>
              <input
                type="number"
                value={newWinnerCount}
                onChange={e => setNewWinnerCount(e.target.value)}
                className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Expires In (hours)</label>
              <input
                type="number"
                value={newExpiresHours}
                onChange={e => setNewExpiresHours(e.target.value)}
                className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none"
              />
            </div>
          </div>

          {/* Preview */}
          {newEntryFee && newPrizePool && newWinnerCount && (
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
              <h4 className="text-xs font-semibold text-yellow-400 mb-2">Revenue Preview</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div className="flex justify-between">
                  <span>Entry Fee</span>
                  <span>R{newEntryFee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Prize Pool</span>
                  <span className="text-yellow-400">R{Number(newPrizePool).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Winners</span>
                  <span>{newWinnerCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Per Winner</span>
                  <span className="text-yellow-400">
                    R{Math.floor(Number(newPrizePool) / Number(newWinnerCount)).toLocaleString()}
                  </span>
                </div>
                <div className="border-t border-gray-800 pt-1 flex justify-between font-semibold">
                  <span>Break-even at</span>
                  <span className="text-green-400">
                    {Math.ceil(Number(newPrizePool) / Number(newEntryFee)).toLocaleString()} players
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newQuestion || newOptions.split('\n').filter(Boolean).length < 2 || creating}
              className="flex-1 bg-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              Create
            </button>
          </div>
        </div>
      )}

      {/* Quiz List */}
      <div className="space-y-3">
        {quizzes.map((quiz) => {
          const totalPicks = quiz.options.reduce((sum, o) => sum + o.pick_count, 0);
          const totalRevenue = quiz.entry_fee * quiz.participants;
          const platformProfit = totalRevenue - quiz.prize_pool;
          const prizePerWinner = quiz.winner_count > 0 ? Math.floor(quiz.prize_pool / quiz.winner_count) : 0;
          const isSettling = settling === quiz.id;

          return (
            <div key={quiz.id} className="bg-[#1a1a2e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-400">{quiz.category}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  quiz.status === 'active' ? 'text-green-400 bg-green-400/10' :
                  quiz.status === 'settled' ? 'text-blue-400 bg-blue-400/10' :
                  quiz.status === 'drawing' ? 'text-yellow-400 bg-yellow-400/10' :
                  'text-gray-400 bg-gray-400/10'
                }`}>{quiz.status}</span>
              </div>

              <p className="font-semibold text-sm mb-3">{quiz.question}</p>

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                <div className="bg-[#0f0f23] rounded-lg p-2">
                  <span className="text-gray-500 block">Entry Fee</span>
                  <span className="font-semibold">{formatMoney(quiz.entry_fee)}</span>
                </div>
                <div className="bg-[#0f0f23] rounded-lg p-2">
                  <span className="text-gray-500 block">Prize Pool</span>
                  <span className="font-semibold text-yellow-400">{formatMoneyShort(quiz.prize_pool)}</span>
                </div>
                <div className="bg-[#0f0f23] rounded-lg p-2">
                  <span className="text-gray-500 block">Participants</span>
                  <span className="font-semibold">{quiz.participants.toLocaleString()}</span>
                </div>
                <div className="bg-[#0f0f23] rounded-lg p-2">
                  <span className="text-gray-500 block">Winners</span>
                  <span className="font-semibold">{quiz.winner_count} &times; {formatMoneyShort(prizePerWinner)}</span>
                </div>
              </div>

              {/* Revenue */}
              <div className="bg-[#0f0f23] rounded-lg p-2 mb-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Revenue</span>
                  <span className="text-green-400 font-semibold">{formatMoneyShort(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Platform Profit</span>
                  <span className={`font-semibold ${platformProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatMoneyShort(platformProfit)}
                  </span>
                </div>
              </div>

              {/* Options with pick distribution */}
              <div className="space-y-1 mb-3">
                {quiz.options.map((opt) => {
                  const pct = totalPicks > 0 ? Math.round((opt.pick_count / totalPicks) * 100) : 0;
                  const isCorrect = quiz.correct_option_id === opt.id;
                  return (
                    <div key={opt.id} className="flex items-center gap-2 text-xs">
                      <span className={`w-28 truncate ${isCorrect ? 'text-green-400 font-semibold' : 'text-gray-400'}`}>
                        {isCorrect ? '>> ' : ''}{opt.label}
                      </span>
                      <div className="flex-1 bg-[#0f0f23] rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isCorrect ? 'bg-green-500/50' : 'bg-purple-500/50'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-gray-500 w-24 text-right">
                        {pct}% ({opt.pick_count.toLocaleString()})
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Settled info */}
              {quiz.status === 'settled' && quiz.correct_count > 0 && (
                <div className="bg-green-500/10 rounded-lg p-2 mb-3 text-xs">
                  <div className="flex justify-between text-green-400">
                    <span>Correct Answers</span>
                    <span>{quiz.correct_count.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-yellow-400">
                    <span>Winners Drawn</span>
                    <span>{quiz.winners?.length ?? 0}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Clock size={12} />
                {quiz.status === 'active' ? 'Expires' : 'Expired'}: {new Date(quiz.expires_at).toLocaleString('en-ZA')}
                {quiz.draw_at && (
                  <span className="ml-2">| Draw: {new Date(quiz.draw_at).toLocaleString('en-ZA')}</span>
                )}
              </div>

              {/* Actions */}
              {quiz.status === 'active' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-gray-500">Set correct answer & draw winners:</p>
                    <button
                      onClick={() => sendTvMessage(quiz, 'quiz_countdown')}
                      className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-[10px] flex items-center gap-1"
                    >
                      <Send size={10} /> Send Countdown
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quiz.options.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleSetCorrectAnswer(quiz, opt.id)}
                        disabled={isSettling}
                        className="bg-green-500/10 text-green-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 active:bg-green-500/30 disabled:opacity-50"
                      >
                        {isSettling ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <CheckCircle size={12} />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleCancel(quiz.id)}
                    className="w-full mt-2 bg-red-500/10 text-red-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                  >
                    <XCircle size={12} /> Cancel & Refund
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {quizzes.length === 0 && (
          <div className="text-center py-12">
            <Tv size={32} className="mx-auto text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm">No quizzes yet. Create one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
