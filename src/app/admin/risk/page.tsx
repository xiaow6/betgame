'use client';

import { useState } from 'react';
import { Shield, AlertTriangle, Save } from 'lucide-react';
import { formatMoneyShort } from '@/lib/constants';
import type { RiskConfig } from '@/types';

export default function RiskControlPage() {
  const [config, setConfig] = useState<RiskConfig>({
    default_rake_percent: 10,
    default_min_players: 10,
    default_min_bet: 100,
    default_max_bet: 50000,
    max_payout_per_event: 5000000,
    signup_bonus: 500,
    referral_bonus: 500,
    dynamic_odds_enabled: false,
    force_result_enabled: false,
  });

  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Will save to Supabase
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateField = (field: keyof RiskConfig, value: number | boolean) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <div className="flex items-center gap-2">
        <Shield size={20} className="text-red-400" />
        <h2 className="font-bold">Risk Control Center</h2>
      </div>

      {/* Platform Rake */}
      <Section title="Platform Rake (Revenue)">
        <SliderField
          label="Default Rake %"
          value={config.default_rake_percent}
          min={1} max={30} step={1}
          onChange={(v) => updateField('default_rake_percent', v)}
          display={`${config.default_rake_percent}%`}
          description="Percentage taken from each event's pool before payout"
        />
      </Section>

      {/* Bet Limits */}
      <Section title="Bet Limits">
        <NumberField
          label="Min Bet"
          value={config.default_min_bet}
          onChange={(v) => updateField('default_min_bet', v)}
          display={formatMoneyShort(config.default_min_bet)}
        />
        <NumberField
          label="Max Bet"
          value={config.default_max_bet}
          onChange={(v) => updateField('default_max_bet', v)}
          display={formatMoneyShort(config.default_max_bet)}
        />
        <NumberField
          label="Max Payout Per Event"
          value={config.max_payout_per_event}
          onChange={(v) => updateField('max_payout_per_event', v)}
          display={formatMoneyShort(config.max_payout_per_event)}
        />
      </Section>

      {/* Player Thresholds */}
      <Section title="Player Thresholds">
        <SliderField
          label="Min Players to Proceed"
          value={config.default_min_players}
          min={2} max={50} step={1}
          onChange={(v) => updateField('default_min_players', v)}
          display={config.default_min_players.toString()}
          description="Events with fewer bettors are cancelled & refunded"
        />
      </Section>

      {/* Bonuses */}
      <Section title="Bonus Configuration">
        <NumberField
          label="Signup Bonus"
          value={config.signup_bonus}
          onChange={(v) => updateField('signup_bonus', v)}
          display={formatMoneyShort(config.signup_bonus)}
        />
        <NumberField
          label="Referral Bonus (each)"
          value={config.referral_bonus}
          onChange={(v) => updateField('referral_bonus', v)}
          display={formatMoneyShort(config.referral_bonus)}
        />
      </Section>

      {/* Advanced Controls */}
      <Section title="Advanced Controls">
        <ToggleField
          label="Dynamic Odds"
          description="Auto-adjust odds based on bet distribution"
          value={config.dynamic_odds_enabled}
          onChange={(v) => updateField('dynamic_odds_enabled', v)}
        />
        <ToggleField
          label="Force Result (Quiz)"
          description="Allow admin to set quiz answer before reveal"
          value={config.force_result_enabled}
          onChange={(v) => updateField('force_result_enabled', v)}
          warning
        />
      </Section>

      {/* Warning */}
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-start gap-2">
        <AlertTriangle size={16} className="text-yellow-400 shrink-0 mt-0.5" />
        <p className="text-xs text-yellow-300">
          Changes to risk controls take effect immediately for new events.
          Existing events keep their original settings.
        </p>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 ${
          saved ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
        }`}
      >
        {saved ? (
          <>Saved ✓</>
        ) : (
          <><Save size={18} /> Save Configuration</>
        )}
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1a1a2e] rounded-xl p-4">
      <h3 className="font-semibold text-sm mb-3 text-gray-300">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, display, description }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display: string; description?: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-400">{label}</span>
        <span className="text-sm font-bold text-green-400">{display}</span>
      </div>
      <input
        type="range"
        value={value}
        min={min} max={max} step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-green-500"
      />
      {description && <p className="text-[10px] text-gray-600 mt-1">{description}</p>}
    </div>
  );
}

function NumberField({ label, value, onChange, display }: {
  label: string; value: number; onChange: (v: number) => void; display: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm text-green-400 font-medium">{display}</span>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-20 bg-[#0f0f23] rounded-lg px-2 py-1.5 text-sm text-white outline-none text-right"
        />
      </div>
    </div>
  );
}

function ToggleField({ label, description, value, onChange, warning = false }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void; warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className={`text-sm ${warning ? 'text-yellow-400' : 'text-gray-400'}`}>{label}</p>
        <p className="text-[10px] text-gray-600">{description}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-full transition-colors relative ${
          value ? 'bg-green-500' : 'bg-gray-700'
        }`}
      >
        <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${
          value ? 'left-6' : 'left-0.5'
        }`} />
      </button>
    </div>
  );
}
