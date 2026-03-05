-- ============================================
-- BetGame - Full Migration (run in Supabase SQL Editor)
-- Safe to re-run (uses IF NOT EXISTS / IF EXISTS checks)
-- ============================================

-- ─── 1. Fix quizzes table: add missing lottery-model columns ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='entry_fee') THEN
    ALTER TABLE quizzes ADD COLUMN entry_fee BIGINT NOT NULL DEFAULT 1000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='prize_pool') THEN
    ALTER TABLE quizzes ADD COLUMN prize_pool BIGINT NOT NULL DEFAULT 10000000;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='winner_count') THEN
    ALTER TABLE quizzes ADD COLUMN winner_count INT NOT NULL DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='participants') THEN
    ALTER TABLE quizzes ADD COLUMN participants INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='correct_count') THEN
    ALTER TABLE quizzes ADD COLUMN correct_count INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='correct_option_id') THEN
    ALTER TABLE quizzes ADD COLUMN correct_option_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='draw_at') THEN
    ALTER TABLE quizzes ADD COLUMN draw_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='settled_at') THEN
    ALTER TABLE quizzes ADD COLUMN settled_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='quizzes' AND column_name='expires_at') THEN
    ALTER TABLE quizzes ADD COLUMN expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours');
  END IF;
END $$;

-- ─── 2. Create missing tables ───

-- Quiz Winners
CREATE TABLE IF NOT EXISTS quiz_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  display_name TEXT NOT NULL,
  prize_amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_winners_quiz ON quiz_winners(quiz_id);

-- Sport Events
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'settled', 'cancelled')),
  min_bet BIGINT NOT NULL DEFAULT 100,
  max_bet BIGINT NOT NULL DEFAULT 50000,
  min_players INT NOT NULL DEFAULT 10,
  rake_percent INT NOT NULL DEFAULT 10,
  total_pool BIGINT NOT NULL DEFAULT 0,
  settled_option_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Event Bet Options
CREATE TABLE IF NOT EXISTS event_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  odds NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  bet_count INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_event_options_event ON event_options(event_id);

-- TV Sync Messages
CREATE TABLE IF NOT EXISTS tv_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tv_messages_quiz ON tv_messages(quiz_id);

-- ─── 3. Ensure bets table has all needed columns ───
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bets' AND column_name='quiz_id') THEN
    ALTER TABLE bets ADD COLUMN quiz_id UUID REFERENCES quizzes(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bets' AND column_name='event_id') THEN
    ALTER TABLE bets ADD COLUMN event_id UUID REFERENCES events(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bets' AND column_name='bet_type') THEN
    ALTER TABLE bets ADD COLUMN bet_type TEXT NOT NULL DEFAULT 'quiz';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bets' AND column_name='fund_source') THEN
    ALTER TABLE bets ADD COLUMN fund_source TEXT NOT NULL DEFAULT 'balance';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bets' AND column_name='potential_win') THEN
    ALTER TABLE bets ADD COLUMN potential_win BIGINT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bets' AND column_name='actual_win') THEN
    ALTER TABLE bets ADD COLUMN actual_win BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bets' AND column_name='settled_at') THEN
    ALTER TABLE bets ADD COLUMN settled_at TIMESTAMPTZ;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_bets_user ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_quiz ON bets(quiz_id);
CREATE INDEX IF NOT EXISTS idx_bets_event ON bets(event_id);

-- ─── 4. RLS Policies (safe to re-run - drops existing first) ───

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE tv_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Users
CREATE POLICY users_select_own ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY users_update_own ON users FOR UPDATE USING (auth.uid() = id);
-- Service role needs full access (bypasses RLS automatically)

-- Quizzes: publicly readable
CREATE POLICY quizzes_select_all ON quizzes FOR SELECT USING (true);
CREATE POLICY quiz_options_select_all ON quiz_options FOR SELECT USING (true);
CREATE POLICY quiz_winners_select_all ON quiz_winners FOR SELECT USING (true);

-- Events: publicly readable
CREATE POLICY events_select_all ON events FOR SELECT USING (true);
CREATE POLICY event_options_select_all ON event_options FOR SELECT USING (true);

-- Bets: users see own
CREATE POLICY bets_select_own ON bets FOR SELECT USING (auth.uid() = user_id);

-- Transactions: users see own
CREATE POLICY transactions_select_own ON transactions FOR SELECT USING (auth.uid() = user_id);

-- Referrals: users see own
CREATE POLICY referrals_select_own ON referrals FOR SELECT
  USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

-- TV messages: publicly readable
CREATE POLICY tv_messages_select_all ON tv_messages FOR SELECT USING (true);

-- ─── 5. Updated_at trigger ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ─── 6. Atomic quiz bet function ───
CREATE OR REPLACE FUNCTION place_quiz_bet(
  p_user_id UUID,
  p_quiz_id UUID,
  p_option_id UUID,
  p_amount BIGINT,
  p_fund_source TEXT DEFAULT 'balance'
)
RETURNS UUID AS $$
DECLARE
  v_bet_id UUID;
  v_balance BIGINT;
  v_quiz_status TEXT;
  v_entry_fee BIGINT;
BEGIN
  -- Lock user row
  IF p_fund_source = 'balance' THEN
    SELECT balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  ELSE
    SELECT free_bet_balance INTO v_balance FROM users WHERE id = p_user_id FOR UPDATE;
  END IF;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Check quiz is active
  SELECT status, entry_fee INTO v_quiz_status, v_entry_fee FROM quizzes WHERE id = p_quiz_id FOR UPDATE;
  IF v_quiz_status IS NULL THEN RAISE EXCEPTION 'Quiz not found'; END IF;
  IF v_quiz_status != 'active' THEN RAISE EXCEPTION 'Quiz is not active'; END IF;

  -- Amount must match entry fee
  IF p_amount != v_entry_fee THEN RAISE EXCEPTION 'Amount must equal entry fee'; END IF;

  -- Check balance
  IF v_balance < p_amount THEN RAISE EXCEPTION 'Insufficient balance'; END IF;

  -- Check no existing bet
  IF EXISTS (SELECT 1 FROM bets WHERE user_id = p_user_id AND quiz_id = p_quiz_id AND status = 'pending') THEN
    RAISE EXCEPTION 'Already placed a bet on this quiz';
  END IF;

  -- Deduct balance
  IF p_fund_source = 'balance' THEN
    UPDATE users SET balance = balance - p_amount WHERE id = p_user_id;
  ELSE
    UPDATE users SET free_bet_balance = free_bet_balance - p_amount WHERE id = p_user_id;
  END IF;

  -- Create bet
  INSERT INTO bets (user_id, bet_type, quiz_id, option_id, amount, fund_source, status)
  VALUES (p_user_id, 'quiz', p_quiz_id, p_option_id, p_amount, p_fund_source, 'pending')
  RETURNING id INTO v_bet_id;

  -- Update counts
  UPDATE quizzes SET participants = participants + 1 WHERE id = p_quiz_id;
  UPDATE quiz_options SET pick_count = pick_count + 1 WHERE id = p_option_id;

  -- Record transaction
  INSERT INTO transactions (user_id, type, amount, balance_after, fund_type, reference_id, description)
  VALUES (
    p_user_id, 'bet_placed', -p_amount,
    (CASE WHEN p_fund_source = 'balance'
      THEN (SELECT balance FROM users WHERE id = p_user_id)
      ELSE (SELECT free_bet_balance FROM users WHERE id = p_user_id)
    END),
    p_fund_source, v_bet_id::TEXT, 'TV Grand Prize entry'
  );

  RETURN v_bet_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Done! ───
SELECT 'Migration complete' AS result;
