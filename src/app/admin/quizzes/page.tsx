'use client';

import { useState } from 'react';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { formatMoneyShort } from '@/lib/constants';

export default function AdminQuizzesPage() {
  const { quizzes } = useStore();
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">Manage Quizzes</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-purple-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1"
        >
          <Plus size={14} /> New Quiz
        </button>
      </div>

      {showCreate && (
        <div className="bg-[#1a1a2e] rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Create Quiz</h3>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Question</label>
            <input className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" placeholder="Enter your question" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <input className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" placeholder="e.g. Soccer Trivia" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Options (one per line)</label>
            <textarea
              className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none resize-none h-24"
              placeholder={"Option A\nOption B\nOption C\nOption D"}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Rake %</label>
              <input type="number" defaultValue={10} className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Expires In (hours)</label>
              <input type="number" defaultValue={24} className="w-full bg-[#0f0f23] rounded-lg px-3 py-2.5 text-sm text-white outline-none" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 bg-gray-700 text-gray-300 py-2.5 rounded-xl text-sm">Cancel</button>
            <button className="flex-1 bg-purple-500 text-white py-2.5 rounded-xl text-sm font-semibold">Create</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {quizzes.map((quiz) => {
          const totalBets = quiz.options.reduce((sum, o) => sum + o.bet_count, 0);
          return (
            <div key={quiz.id} className="bg-[#1a1a2e] rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-purple-400">{quiz.category}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  quiz.status === 'active' ? 'text-green-400 bg-green-400/10' : 'text-gray-400 bg-gray-400/10'
                }`}>{quiz.status}</span>
              </div>

              <p className="font-semibold text-sm mb-2">{quiz.question}</p>

              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                <div><span className="text-gray-500">Pool:</span> {formatMoneyShort(quiz.total_pool)}</div>
                <div><span className="text-gray-500">Players:</span> {totalBets}</div>
                <div><span className="text-gray-500">Rake:</span> <span className="text-green-400">{quiz.rake_percent}%</span></div>
              </div>

              {/* Options with bet distribution */}
              <div className="space-y-1 mb-3">
                {quiz.options.map((opt) => {
                  const pct = quiz.total_pool > 0 ? Math.round((opt.total_amount / quiz.total_pool) * 100) : 0;
                  return (
                    <div key={opt.id} className="flex items-center gap-2 text-xs">
                      <span className="w-24 truncate text-gray-400">{opt.label}</span>
                      <div className="flex-1 bg-[#0f0f23] rounded-full h-2 overflow-hidden">
                        <div className="bg-purple-500/50 h-full rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-gray-500 w-16 text-right">{pct}% ({opt.bet_count})</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <Clock size={12} />
                Expires: {new Date(quiz.expires_at).toLocaleString('en-ZA')}
              </div>

              {/* Settle Actions */}
              {quiz.status === 'active' && (
                <div>
                  <p className="text-[10px] text-gray-500 mb-2">Set correct answer:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quiz.options.map((opt) => (
                      <button
                        key={opt.id}
                        className="bg-green-500/10 text-green-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 active:bg-green-500/30"
                      >
                        <CheckCircle size={12} /> {opt.label}
                      </button>
                    ))}
                  </div>
                  <button className="w-full mt-2 bg-red-500/10 text-red-400 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1">
                    <XCircle size={12} /> Cancel & Refund
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
