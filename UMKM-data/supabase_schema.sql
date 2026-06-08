-- =========================================================================
-- UHP v3.0 — Supabase Schema & Seeding Script
-- Copy and run this script in the Supabase SQL Editor (https://supabase.com)
-- =========================================================================

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── CLEAN SLATE (Optional / Reset) ──────────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Delete existing seeded users (cascades to profiles, umkm, and transactions)
DELETE FROM auth.users WHERE email IN (
  'andi@uhp.id',
  'zaky@uhp.id',
  'brama@uhp.id',
  'ghifary@uhp.id',
  'luthfia@uhp.id',
  'prayata@uhp.id'
);

-- Drop tables in public schema if they exist
DROP TABLE IF EXISTS public.transactions;
DROP TABLE IF EXISTS public.umkm_history;
DROP TABLE IF EXISTS public.umkm_profiles;
DROP TABLE IF EXISTS public.profiles;

-- ─── CREATE TABLES ────────────────────────────────────────────────────────

-- 1. Profiles Table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. UMKM Profiles Table
CREATE TABLE public.umkm_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  location TEXT NOT NULL,
  tenure INTEGER NOT NULL DEFAULT 1,
  current_class TEXT NOT NULL DEFAULT 'Growth',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. UMKM Monthly History Table (for charts)
CREATE TABLE public.umkm_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID REFERENCES public.umkm_profiles(id) ON DELETE CASCADE NOT NULL,
  month TEXT NOT NULL, -- Format: "Des 2025", "Jan 2026", etc.
  revenue NUMERIC NOT NULL DEFAULT 0,
  expenses NUMERIC NOT NULL DEFAULT 0,
  transactions INTEGER NOT NULL DEFAULT 0,
  sentiment NUMERIC NOT NULL DEFAULT 0,
  class TEXT NOT NULL DEFAULT 'Growth'
);

-- 4. Transactions Table (Data Explorer - Realtime)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  umkm_id UUID REFERENCES public.umkm_profiles(id) ON DELETE CASCADE NOT NULL,
  order_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  amount NUMERIC NOT NULL, -- (price * quantity)
  review_text TEXT,
  sentiment_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ─── ROW LEVEL SECURITY (RLS) POLICIES ────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.umkm_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Allow public select on profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- UMKM Profiles Policies
CREATE POLICY "Users can select own UMKM profile" ON public.umkm_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own UMKM profile" ON public.umkm_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own UMKM profile" ON public.umkm_profiles FOR UPDATE USING (user_id = auth.uid());

-- UMKM History Policies
CREATE POLICY "Users can select own UMKM history" ON public.umkm_history FOR SELECT USING (
  umkm_id IN (SELECT id FROM public.umkm_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can modify own UMKM history" ON public.umkm_history FOR ALL USING (
  umkm_id IN (SELECT id FROM public.umkm_profiles WHERE user_id = auth.uid())
);

-- Transactions Policies
CREATE POLICY "Users can select own UMKM transactions" ON public.transactions FOR SELECT USING (
  umkm_id IN (SELECT id FROM public.umkm_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can insert own UMKM transactions" ON public.transactions FOR INSERT WITH CHECK (
  umkm_id IN (SELECT id FROM public.umkm_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "Users can modify own UMKM transactions" ON public.transactions FOR ALL USING (
  umkm_id IN (SELECT id FROM public.umkm_profiles WHERE user_id = auth.uid())
);

-- ─── AUTOMATIC PROFILE CREATION TRIGGER ───────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    upper(substring(coalesce(new.raw_user_meta_data->>'name', new.email), 1, 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── SEEDING NOTE ──────────────────────────────────────────────────────────
-- Seeding is now handled dynamically by the application client-side.
-- Simply register a new account on the "Daftar Akun" page (register.html),
-- and the app will automatically seed 17 months of trend history and 20 recent
-- transactions for that user's UMKM profile in real-time.
