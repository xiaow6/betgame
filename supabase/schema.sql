-- ============================================
-- BetGame - Supabase Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== USERS ====================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'Player',
  avatar_url TEXT,
  balance BIGINT NOT NULL DEFAULT 0,          -- cents
  free_bet_balance BIGINT NOT NULL DEFAULT 0, -- cents
  referral_code TEXT UNIQUE NOT NULL,
  referred_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'frozen', 'banned')),
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_referral_code ON users(referral_code);

-- ==================== SPORT EVENTS ====================
CREATE TABLE sport_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('soccer', 'cricket', 'rugby', 'basketball', 'tennis', 'other')),
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'settled', 'cancelled')),
  min_bet BIGINT NOT NULL DEFAULT 100,
  max_bet BIGINT NOT NULL DEFAULT 50000,
  min_players INT NOT NULL DEFAULT 10,
  rake_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  total_pool BIGINT NOT NULL DEFAULT 0,
  settled_option_id UUID,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_status ON sport_events(status);

-- ==================== BET OPTIONS ====================
CREATE TABLE bet_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES sport_events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  odds DECIMAL(10,2) NOT NULL DEFAULT 2.00,
  total_amount BIGINT NOT NULL DEFAULT 0,
  bet_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_bet_options_event ON bet_options(event_id);

-- ==================== QUIZZES ====================
CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'settled', 'cancelled')),
  correct_option_id UUID,
  min_bet BIGINT NOT NULL DEFAULT 100,
  max_bet BIGINT NOT NULL DEFAULT 10000,
  min_players INT NOT NULL DEFAULT 10,
  rake_percent DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  total_pool BIGINT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== QUIZ OPTIONS ====================
CREATE TABLE quiz_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  total_amount BIGINT NOT NULL DEFAULT 0,
  bet_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_quiz_options_quiz ON quiz_options(quiz_id);

-- ==================== BETS ====================
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  bet_type TEXT NOT NULL CHECK (bet_type IN ('sport', 'quiz')),
  event_id UUID REFERENCES sport_events(id),
  quiz_id UUID REFERENCES quizzes(id),
  option_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  fund_source TEXT NOT NULL CHECK (fund_source IN ('balance', 'free_bet')),
  potential_win BIGINT NOT NULL DEFAULT 0,
  actual_win BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'refunded', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  CHECK (
    (bet_type = 'sport' AND event_id IS NOT NULL) OR
    (bet_type = 'quiz' AND quiz_id IS NOT NULL)
  )
);

CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_event ON bets(event_id);
CREATE INDEX idx_bets_quiz ON bets(quiz_id);
CREATE INDEX idx_bets_status ON bets(status);

-- ==================== TRANSACTIONS ====================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet_placed', 'bet_won', 'bet_refund', 'referral_bonus', 'signup_bonus', 'admin_adjust', 'draw_prize')),
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  fund_type TEXT NOT NULL CHECK (fund_type IN ('balance', 'free_bet')),
  reference_id UUID,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- ==================== REFERRALS ====================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referee_id UUID NOT NULL REFERENCES users(id),
  referrer_bonus BIGINT NOT NULL DEFAULT 500,
  referee_bonus BIGINT NOT NULL DEFAULT 500,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);

-- ==================== DRAWS (TV Live Draw) ====================
CREATE TABLE draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES sport_events(id),
  quiz_id UUID REFERENCES quizzes(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'live', 'drawing', 'completed', 'cancelled')),
  draw_type TEXT NOT NULL CHECK (draw_type IN ('random', 'weighted', 'top_bettors')),
  prize_amount BIGINT NOT NULL DEFAULT 0,
  prize_description TEXT,
  total_eligible INT NOT NULL DEFAULT 0,
  winner_count INT NOT NULL DEFAULT 1,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  -- Audit fields
  drawn_by UUID REFERENCES users(id),      -- Admin who triggered
  draw_seed TEXT,                            -- Random seed for audit
  draw_algorithm TEXT,                       -- Algorithm description
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_draws_status ON draws(status);
CREATE INDEX idx_draws_event ON draws(event_id);

-- ==================== DRAW PARTICIPANTS ====================
CREATE TABLE draw_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID NOT NULL REFERENCES draws(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  display_name_masked TEXT NOT NULL,      -- e.g., "Th***do" or "+27 81***4567"
  bet_amount BIGINT NOT NULL DEFAULT 0,   -- Their total bet (for weighted draws)
  is_winner BOOLEAN NOT NULL DEFAULT false,
  prize_amount BIGINT,
  position INT,                            -- Winner rank (1st, 2nd, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_draw_participants_draw ON draw_participants(draw_id);
CREATE INDEX idx_draw_participants_user ON draw_participants(user_id);

-- ==================== DRAW AUDIT LOG ====================
CREATE TABLE draw_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  draw_id UUID NOT NULL REFERENCES draws(id),
  action TEXT NOT NULL,                    -- 'created', 'started', 'participant_added', 'winner_selected', 'prize_paid', 'completed'
  actor_id UUID REFERENCES users(id),      -- Who performed the action
  details JSONB NOT NULL DEFAULT '{}',     -- Detailed action data
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_draw_audit_draw ON draw_audit_log(draw_id);
CREATE INDEX idx_draw_audit_created ON draw_audit_log(created_at);

-- ==================== EVENT RECONCILIATION ====================
CREATE TABLE event_reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES sport_events(id),
  quiz_id UUID REFERENCES quizzes(id),
  total_bets INT NOT NULL,
  total_pool BIGINT NOT NULL,
  platform_rake BIGINT NOT NULL,
  prize_pool BIGINT NOT NULL,
  total_payout BIGINT NOT NULL,
  platform_profit BIGINT NOT NULL,
  variance BIGINT NOT NULL DEFAULT 0,
  options_breakdown JSONB NOT NULL DEFAULT '[]',
  anomalies JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== RISK CONFIG ====================
CREATE TABLE risk_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Default risk config values
INSERT INTO risk_config (key, value, description) VALUES
  ('default_rake_percent', '10', 'Default platform rake percentage'),
  ('default_min_players', '10', 'Minimum bettors for event to proceed'),
  ('default_min_bet', '100', 'Minimum bet amount in cents'),
  ('default_max_bet', '50000', 'Maximum bet amount in cents'),
  ('max_payout_per_event', '5000000', 'Maximum total payout per event in cents'),
  ('signup_bonus', '500', 'New user signup bonus in cents'),
  ('referral_bonus', '500', 'Referral bonus per side in cents'),
  ('dynamic_odds_enabled', 'false', 'Auto-adjust odds based on pool distribution'),
  ('force_result_enabled', 'false', 'Allow admin to force quiz results');

-- ==================== TV API TOKENS ====================
CREATE TABLE tv_api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,                      -- e.g., "SABC TV Studio"
  token_hash TEXT UNIQUE NOT NULL,         -- Hashed API token
  permissions TEXT[] NOT NULL DEFAULT '{}', -- e.g., {'draws:read', 'draws:trigger'}
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==================== FUNCTIONS ====================

-- Place a bet with atomic balance deduction
CREATE OR REPLACE FUNCTION place_bet(
  p_user_id UUID,
  p_bet_type TEXT,
  p_event_id UUID,
  p_quiz_id UUID,
  p_option_id UUID,
  p_amount BIGINT,
  p_fund_source TEXT,
  p_potential_win BIGINT
) RETURNS UUID AS $$
DECLARE
  v_bet_id UUID;
  v_balance BIGINT;
BEGIN
  -- Lock user row
  IF p_fund_source = 'balance' THEN
    SELECT balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  ELSE
    SELECT free_bet_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct balance
  IF p_fund_source = 'balance' THEN
    UPDATE users SET balance = balance - p_amount, updated_at = now() WHERE id = p_user_id;
  ELSE
    UPDATE users SET free_bet_balance = free_bet_balance - p_amount, updated_at = now() WHERE id = p_user_id;
  END IF;

  -- Create bet
  INSERT INTO bets (user_id, bet_type, event_id, quiz_id, option_id, amount, fund_source, potential_win)
  VALUES (p_user_id, p_bet_type, p_event_id, p_quiz_id, p_option_id, p_amount, p_fund_source, p_potential_win)
  RETURNING id INTO v_bet_id;

  -- Update option totals
  IF p_bet_type = 'sport' THEN
    UPDATE bet_options SET total_amount = total_amount + p_amount, bet_count = bet_count + 1 WHERE id = p_option_id;
    UPDATE sport_events SET total_pool = total_pool + p_amount WHERE id = p_event_id;
  ELSE
    UPDATE quiz_options SET total_amount = total_amount + p_amount, bet_count = bet_count + 1 WHERE id = p_option_id;
    UPDATE quizzes SET total_pool = total_pool + p_amount WHERE id = p_quiz_id;
  END IF;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, balance_after, fund_type, reference_id, description)
  VALUES (p_user_id, 'bet_placed', -p_amount, v_balance - p_amount,
    CASE WHEN p_fund_source = 'balance' THEN 'balance' ELSE 'free_bet' END,
    v_bet_id, 'Bet placed');

  RETURN v_bet_id;
END;
$$ LANGUAGE plpgsql;

-- Settle event and pay winners
CREATE OR REPLACE FUNCTION settle_event(
  p_event_id UUID,
  p_winning_option_id UUID,
  p_admin_id UUID
) RETURNS VOID AS $$
DECLARE
  v_event RECORD;
  v_winning_option RECORD;
  v_rake BIGINT;
  v_prize_pool BIGINT;
  v_total_payout BIGINT := 0;
  v_bet RECORD;
  v_win_amount BIGINT;
BEGIN
  -- Lock event
  SELECT * INTO v_event FROM sport_events WHERE id = p_event_id FOR UPDATE;
  IF v_event.status != 'live' AND v_event.status != 'upcoming' THEN
    RAISE EXCEPTION 'Event not in settleable state';
  END IF;

  SELECT * INTO v_winning_option FROM bet_options WHERE id = p_winning_option_id;

  -- Calculate rake and prize pool
  v_rake := (v_event.total_pool * v_event.rake_percent / 100)::BIGINT;
  v_prize_pool := v_event.total_pool - v_rake;

  -- Update event
  UPDATE sport_events SET status = 'settled', settled_option_id = p_winning_option_id, settled_at = now() WHERE id = p_event_id;

  -- Process bets
  FOR v_bet IN SELECT * FROM bets WHERE event_id = p_event_id AND status = 'pending' LOOP
    IF v_bet.option_id = p_winning_option_id THEN
      -- Winner: proportional payout
      IF v_winning_option.total_amount > 0 THEN
        v_win_amount := (v_bet.amount::DECIMAL / v_winning_option.total_amount * v_prize_pool)::BIGINT;
      ELSE
        v_win_amount := 0;
      END IF;

      UPDATE bets SET status = 'won', actual_win = v_win_amount, settled_at = now() WHERE id = v_bet.id;

      -- Credit winnings to balance (even if bet was free_bet, winnings go to real balance)
      UPDATE users SET balance = balance + v_win_amount, updated_at = now() WHERE id = v_bet.user_id;

      INSERT INTO transactions (user_id, type, amount, balance_after, fund_type, reference_id, description)
      SELECT v_bet.user_id, 'bet_won', v_win_amount, balance, 'balance', v_bet.id, 'Bet won!'
      FROM users WHERE id = v_bet.user_id;

      v_total_payout := v_total_payout + v_win_amount;
    ELSE
      -- Loser
      UPDATE bets SET status = 'lost', actual_win = 0, settled_at = now() WHERE id = v_bet.id;
    END IF;
  END LOOP;

  -- Record reconciliation
  INSERT INTO event_reconciliations (event_id, total_bets, total_pool, platform_rake, prize_pool, total_payout, platform_profit, variance)
  VALUES (
    p_event_id,
    (SELECT COUNT(*) FROM bets WHERE event_id = p_event_id),
    v_event.total_pool,
    v_rake,
    v_prize_pool,
    v_total_payout,
    v_event.total_pool - v_total_payout,
    v_prize_pool - v_total_payout  -- Should be ~0
  );
END;
$$ LANGUAGE plpgsql;

-- Mask user display name for TV: "Thando" -> "Th***do"
CREATE OR REPLACE FUNCTION mask_name(name TEXT) RETURNS TEXT AS $$
BEGIN
  IF LENGTH(name) <= 3 THEN
    RETURN LEFT(name, 1) || '***';
  END IF;
  RETURN LEFT(name, 2) || '***' || RIGHT(name, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Mask phone for TV: "+27812345678" -> "+27 81***5678"
CREATE OR REPLACE FUNCTION mask_phone(phone TEXT) RETURNS TEXT AS $$
BEGIN
  IF LENGTH(phone) < 8 THEN RETURN '***'; END IF;
  RETURN LEFT(phone, 5) || '***' || RIGHT(phone, 4);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
