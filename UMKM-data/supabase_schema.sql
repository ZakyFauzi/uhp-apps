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

-- ─── SEED DATA ────────────────────────────────────────────────────────────

-- 1. Insert 6 Users into auth.users (triggers will create profiles)
-- Passwords will be 'andi123', 'zaky123', 'brama123', 'ghifary123', 'luthfia123', 'prayata123'
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  aud,
  role,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin
)
VALUES
  (
    '8a7b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    '00000000-0000-0000-0000-000000000000',
    'andi@uhp.id',
    crypt('andi123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"name":"Andi"}',
    false
  ),
  (
    '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d',
    '00000000-0000-0000-0000-000000000000',
    'zaky@uhp.id',
    crypt('zaky123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"name":"Zaky Muhammad Fauzi"}',
    false
  ),
  (
    '0a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d',
    '00000000-0000-0000-0000-000000000000',
    'brama@uhp.id',
    crypt('brama123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"name":"Brama Hartoyo"}',
    false
  ),
  (
    '1a0b9c8d-7e6f-5a4b-3c2d-1e0f9a8b7c6d',
    '00000000-0000-0000-0000-000000000000',
    'ghifary@uhp.id',
    crypt('ghifary123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"name":"Ghifary Wibisono"}',
    false
  ),
  (
    '2a1b0c9d-8e7f-6a5b-4c3d-2e1f0a9b8c7d',
    '00000000-0000-0000-0000-000000000000',
    'luthfia@uhp.id',
    crypt('luthfia123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"name":"Luthfia Maulidya Izzati"}',
    false
  ),
  (
    '3a2b1c0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d',
    '00000000-0000-0000-0000-000000000000',
    'prayata@uhp.id',
    crypt('prayata123', gen_salt('bf', 10)),
    now(),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}',
    '{"name":"Prayata Yasinkha Adnien"}',
    false
  );

-- 2. Seed UMKM Profiles
-- Assign UMKM profiles to the seeded users
-- UUIDs of UMKM Profiles:
-- Andi:  'e001e001-e001-e001-e001-e001e001e001'
-- Zaky:  'e002e002-e002-e002-e002-e002e002e002'
-- Brama: 'e003e003-e003-e003-e003-e003e003e003'
-- Ghif:  'e004e004-e004-e004-e004-e004e004e004'
-- Luth:  'e005e005-e005-e005-e005-e005e005e005'
-- Pray:  'e006e006-e006-e006-e006-e006e006e006'
INSERT INTO public.umkm_profiles (id, user_id, name, sector, location, tenure, current_class)
VALUES
  ('e001e001-e001-e001-e001-e001e001e001', '8a7b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', 'Warung Makan Pak Andi', 'Kuliner', 'Bandung, Jawa Barat', 84, 'Elite'),
  ('e002e002-e002-e002-e002-e002e002e002', '9a8b7c6d-5e4f-3a2b-1c0d-9e8f7a6b5c4d', 'Tech Supplies Zaky', 'Teknologi', 'Jakarta Selatan', 48, 'Growth'),
  ('e003e003-e003-e003-e003-e003e003e003', '0a9b8c7d-6e5f-4a3b-2c1d-0e9f8a7b6c5d', 'Brama Coffee House', 'F&B / Kafe', 'Yogyakarta', 30, 'Growth'),
  ('e004e004-e004-e004-e004-e004e004e004', '1a0b9c8d-7e6f-5a4b-3c2d-1e0f9a8b7c6d', 'Ghifary Digital Print', 'Percetakan Digital', 'Surabaya', 18, 'Struggling'),
  ('e005e005-e005-e005-e005-e005e005e005', '2a1b0c9d-8e7f-6a5b-4c3d-2e1f0a9b8c7d', 'Luthfia Beauty Care', 'Kecantikan', 'Malang, Jawa Timur', 36, 'Elite'),
  ('e006e006-e006-e006-e006-e006e006e006', '3a2b1c0d-9e8f-7a6b-5c4d-3e2f1a0b9c8d', 'Adnien Craft Studio', 'Kerajinan Tangan', 'Solo, Jawa Tengah', 8, 'Critical');

-- 3. Seed UMKM Monthly History
INSERT INTO public.umkm_history (umkm_id, month, revenue, expenses, transactions, sentiment, class)
VALUES
  -- Andi (Elite)
  ('e001e001-e001-e001-e001-e001e001e001', 'Des 2025', 18500000, 11800000, 145, 0.72, 'Elite'),
  ('e001e001-e001-e001-e001-e001e001e001', 'Jan 2026', 21000000, 13200000, 168, 0.68, 'Elite'),
  ('e001e001-e001-e001-e001-e001e001e001', 'Feb 2026', 19200000, 12500000, 152, 0.75, 'Elite'),
  ('e001e001-e001-e001-e001-e001e001e001', 'Mar 2026', 20500000, 13000000, 160, 0.70, 'Elite'),
  ('e001e001-e001-e001-e001-e001e001e001', 'Apr 2026', 22000000, 13800000, 175, 0.78, 'Elite'),
  ('e001e001-e001-e001-e001-e001e001e001', 'May 2026', 21500000, 13500000, 170, 0.74, 'Elite'),

  -- Zaky (Growth)
  ('e002e002-e002-e002-e002-e002e002e002', 'Des 2025', 9500000, 7200000, 95, 0.35, 'Growth'),
  ('e002e002-e002-e002-e002-e002e002e002', 'Jan 2026', 11000000, 8500000, 110, 0.30, 'Growth'),
  ('e002e002-e002-e002-e002-e002e002e002', 'Feb 2026', 8800000, 7000000, 88, 0.28, 'Growth'),
  ('e002e002-e002-e002-e002-e002e002e002', 'Mar 2026', 10200000, 7800000, 102, 0.40, 'Growth'),
  ('e002e002-e002-e002-e002-e002e002e002', 'Apr 2026', 12500000, 9200000, 125, 0.45, 'Growth'),
  ('e002e002-e002-e002-e002-e002e002e002', 'May 2026', 11800000, 8800000, 118, 0.38, 'Growth'),

  -- Brama (Growth)
  ('e003e003-e003-e003-e003-e003e003e003', 'Des 2025', 7200000, 5800000, 72, 0.25, 'Struggling'),
  ('e003e003-e003-e003-e003-e003e003e003', 'Jan 2026', 8500000, 6200000, 85, 0.32, 'Growth'),
  ('e003e003-e003-e003-e003-e003e003e003', 'Feb 2026', 7800000, 6000000, 78, 0.30, 'Growth'),
  ('e003e003-e003-e003-e003-e003e003e003', 'Mar 2026', 9000000, 6500000, 90, 0.42, 'Growth'),
  ('e003e003-e003-e003-e003-e003e003e003', 'Apr 2026', 9500000, 6800000, 95, 0.48, 'Growth'),
  ('e003e003-e003-e003-e003-e003e003e003', 'May 2026', 10200000, 7200000, 102, 0.45, 'Growth'),

  -- Ghifary (Struggling)
  ('e004e004-e004-e004-e004-e004e004e004', 'Des 2025', 5200000, 5500000, 52, -0.10, 'Struggling'),
  ('e004e004-e004-e004-e004-e004e004e004', 'Jan 2026', 6800000, 6200000, 68, 0.05, 'Growth'),
  ('e004e004-e004-e004-e004-e004e004e004', 'Feb 2026', 4500000, 5000000, 45, -0.15, 'Struggling'),
  ('e004e004-e004-e004-e004-e004e004e004', 'Mar 2026', 5000000, 5200000, 50, -0.08, 'Struggling'),
  ('e004e004-e004-e004-e004-e004e004e004', 'Apr 2026', 5500000, 5400000, 55, 0.02, 'Struggling'),
  ('e004e004-e004-e004-e004-e004e004e004', 'May 2026', 5800000, 5600000, 58, 0.10, 'Struggling'),

  -- Luthfia (Elite)
  ('e005e005-e005-e005-e005-e005e005e005', 'Des 2025', 15000000, 9500000, 120, 0.65, 'Elite'),
  ('e005e005-e005-e005-e005-e005e005e005', 'Jan 2026', 18000000, 11000000, 144, 0.70, 'Elite'),
  ('e005e005-e005-e005-e005-e005e005e005', 'Feb 2026', 14200000, 9200000, 114, 0.62, 'Elite'),
  ('e005e005-e005-e005-e005-e005e005e005', 'Mar 2026', 16500000, 10200000, 132, 0.72, 'Elite'),
  ('e005e005-e005-e005-e005-e005e005e005', 'Apr 2026', 17800000, 10800000, 142, 0.75, 'Elite'),
  ('e005e005-e005-e005-e005-e005e005e005', 'May 2026', 19000000, 11500000, 152, 0.78, 'Elite'),

  -- Prayata (Critical)
  ('e006e006-e006-e006-e006-e006e006e006', 'Des 2025', 2200000, 3000000, 22, -0.30, 'Critical'),
  ('e006e006-e006-e006-e006-e006e006e006', 'Jan 2026', 3500000, 3200000, 35, -0.15, 'Struggling'),
  ('e006e006-e006-e006-e006-e006e006e006', 'Feb 2026', 1800000, 2800000, 18, -0.40, 'Critical'),
  ('e006e006-e006-e006-e006-e006e006e006', 'Mar 2026', 2000000, 2900000, 20, -0.35, 'Critical'),
  ('e006e006-e006-e006-e006-e006e006e006', 'Apr 2026', 2500000, 3100000, 25, -0.25, 'Critical'),
  ('e006e006-e006-e006-e006-e006e006e006', 'May 2026', 2800000, 3200000, 28, -0.20, 'Critical');

-- 4. Seed Transactions (Data Explorer)
-- Andi (e001e001-e001-e001-e001-e001e001e001)
INSERT INTO public.transactions (umkm_id, order_number, date, customer_name, item_name, quantity, price, amount, review_text, sentiment_score)
VALUES
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-001', '2026-05-02', 'Budi Santoso', 'Nasi Goreng Spesial + Ayam Goreng', 2, 35000, 70000, 'Nasi gorengnya enak sekali, bumbu meresap dan porsi sangat kenyang!', 0.85),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-002', '2026-05-05', 'Siti Rahma', 'Paket Nasi Liwet Ayam Bakar', 4, 45000, 180000, 'Ayam bakar madunya mantap, sambal dadaknya pedas nampol. Sukses terus!', 0.90),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-003', '2026-05-10', 'Ahmad Dani', 'Es Teh Manis Jumbo', 5, 6000, 30000, 'Tehnya segar dan manisnya pas.', 0.60),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-004', '2026-05-12', 'Dewi Lestari', 'Sop Buntut Sapi', 1, 65000, 65000, 'Kuah sop buntutnya gurih banget, dagingnya empuk tidak alot.', 0.80),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-005', '2026-05-15', 'Rian Hidayat', 'Ayam Goreng Kalasan', 3, 28000, 84000, 'Gorengannya agak sedikit berminyak hari ini, tapi rasanya tetap konsisten enak.', 0.45),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-006', '2026-05-18', 'Eka Wijaya', 'Nasi Timbel Komplit', 2, 40000, 80000, 'Lalapan segar, sambal enak, ayamnya bumbunya meresap sampai ke tulang.', 0.88),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-007', '2026-05-22', 'Putri Ayu', 'Cumi Tepung Crispy', 1, 38000, 38000, 'Cuminya renyah dan tidak amis. Porsi lumayan banyak.', 0.75),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-008', '2026-05-25', 'Hendrik', 'Karedok Sunda', 2, 18000, 36000, 'Bumbu kacangnya legit sekali, sayurannya bersih dan fresh.', 0.82),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-009', '2026-05-27', 'Lia Mariana', 'Jus Alpukat', 3, 15000, 45000, 'Jus kental dan rasanya manis alami, enak diminum siang hari.', 0.78),
  ('e001e001-e001-e001-e001-e001e001e001', 'ORD-010', '2026-05-30', 'Joko Susilo', 'Nasi Goreng Kambing', 2, 42000, 84000, 'Daging kambingnya tidak bau prengus, porsinya juga mengenyangkan.', 0.80);

-- Zaky (e002e002-e002-e002-e002-e002e002e002)
INSERT INTO public.transactions (umkm_id, order_number, date, customer_name, item_name, quantity, price, amount, review_text, sentiment_score)
VALUES
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-001', '2026-05-02', 'Andi Pratama', 'Mouse Wireless Silent 2.4G', 5, 120000, 600000, 'Mouse berfungsi dengan baik, tidak berisik saat diklik. Cocok buat kantor.', 0.70),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-002', '2026-05-07', 'Rina Melati', 'Keyboard Mechanical RGB Blue Switch', 2, 450000, 900000, 'Keyboard suaranya clicky mantap, respon cepat. Packing bubble wrap tebal aman.', 0.85),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-003', '2026-05-12', 'Gani', 'USB Type-C Hub 5-in-1', 3, 180000, 540000, 'Alat berfungsi, tapi pengiriman kurir lambat sekali sampai 4 hari.', 0.10),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-004', '2026-05-15', 'Fajar', 'TWS Earbuds Bluetooth 5.3', 4, 250000, 1000000, 'Suara bass nendang, baterai awet dipakai seharian. Recomended seller!', 0.80),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-005', '2026-05-18', 'Citra', 'Webcam Full HD 1080P dengan Mic', 1, 320000, 320000, 'Gambar cukup jernih di kondisi cahaya terang, mic bawaan standar saja.', 0.40),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-006', '2026-05-22', 'Rudi', 'Kabel HDMI 2.1 Ultra High Speed', 10, 45000, 450000, 'Kualitas kabel tebal, support resolusi 4K dengan lancar. Good.', 0.65),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-007', '2026-05-24', 'Tari', 'Stand Holder Laptop Aluminium', 3, 150000, 450000, 'Bahan kokoh dari logam, laptop jadi tidak gampang panas. Desain rapi.', 0.78),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-008', '2026-05-26', 'Yudi', 'Charger GaN 65W Dual Port Type-C', 2, 290000, 580000, 'Cas HP dan laptop sekaligus aman tidak panas berlebih. Ringkas dibawa.', 0.72),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-009', '2026-05-28', 'Mega', 'Mousepad Gaming XL Deskmat', 6, 85000, 510000, 'Jahitan pinggir rapi, permukaan halus. Mouse gliding dengan lancar.', 0.75),
  ('e002e002-e002-e002-e002-e002e002e002', 'ORD-010', '2026-05-30', 'Bagus', 'Flashdisk USB 3.0 64GB', 15, 75000, 1125000, 'Kecepatan read-write cepat, fisik flashdisk kecil ringkas.', 0.60);

-- Brama (e003e003-e003-e003-e003-e003e003e003)
INSERT INTO public.transactions (umkm_id, order_number, date, customer_name, item_name, quantity, price, amount, review_text, sentiment_score)
VALUES
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-001', '2026-05-02', 'Indah', 'Iced Caffè Latte', 3, 28000, 84000, 'Kopi lattenya creamy, espressonya tidak terlalu asam. Pas buat nemani kerja.', 0.80),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-002', '2026-05-05', 'Toni', 'Espresso Double Shot', 2, 22000, 44000, 'Espressonya bold, crema tebal. Mantap langsung bikin melek.', 0.85),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-003', '2026-05-10', 'Rangga', 'Butter Croissant hangat', 4, 25000, 100000, 'Croissant renyah di luar lembut di dalam, wangi butter terasa.', 0.82),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-004', '2026-05-14', 'Dewi', 'Es Kopi Susu Gula Aren', 8, 20000, 160000, 'Rasa kopi susu standar seperti kedai sebelah, gula aren kurang berasa.', 0.20),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-005', '2026-05-17', 'Agung', 'Matcha Green Tea Latte', 1, 30000, 30000, 'Bubuk matchanya berkualitas, tidak terlalu manis. Tempatnya nyaman sekali.', 0.78),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-006', '2026-05-20', 'Riri', 'French Fries & Sausage', 3, 26000, 78000, 'Kentang goreng kurang garing dan porsinya agak sedikit dibanding harganya.', -0.15),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-007', '2026-05-23', 'Bambang', 'Manual Brew V60 (Flores Bajawa)', 2, 32000, 64000, 'Notes fruity-nya keluar, barista ramah diajak diskusi soal kopi.', 0.88),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-008', '2026-05-25', 'Novi', 'Chocolate Almond Croissant', 2, 30000, 60000, 'Cokelatnya lumer melimpah, taburan almond di atasnya banyak.', 0.84),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-009', '2026-05-28', 'Diki', 'Hot Cappuccino Art', 3, 28000, 84000, 'Latte art-nya cantik, foam susu pas tebalnya. Rekomendasi buat nongkrong.', 0.80),
  ('e003e003-e003-e003-e003-e003e003e003', 'ORD-010', '2026-05-30', 'Amel', 'Avocado Coffee Float', 1, 35000, 35000, 'Es krimnya enak dikombinasikan dengan alpukat blender segar.', 0.70);

-- Ghifary (e004e004-e004-e004-e004-e004e004e004)
INSERT INTO public.transactions (umkm_id, order_number, date, customer_name, item_name, quantity, price, amount, review_text, sentiment_score)
VALUES
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-001', '2026-05-02', 'Dian', 'Cetak Spanduk Flexi 3x1m', 2, 75000, 150000, 'Cetak spanduk hasilnya lumayan tajam warnanya, tapi penyelesaian molor 1 hari.', 0.15),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-002', '2026-05-05', 'Hasan', 'Print Dokumen A4 HVS (B/W)', 200, 500, 100000, 'Print cepat dan harga murah, tapi ada beberapa lembar yang kertasnya terlipat.', 0.10),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-003', '2026-05-09', 'Roni', 'Jilid Hardcover Skripsi', 3, 45000, 135000, 'Hasil jilid rapi dan kuat, tulisan emas di cover presisi.', 0.75),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-004', '2026-05-12', 'Fitri', 'Cetak Stiker A3+ Bontax Glossy', 10, 15000, 150000, 'Stiker bagus warnanya keluar, tapi cutting pinggirnya kurang rapi sedikit.', 0.05),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-005', '2026-05-15', 'Danu', 'Cetak Kartu Nama (2 Sisi + Laminasi)', 5, 45000, 225000, 'Kertas tebal, potongannya presisi. Pelayanan CS online agak lambat membalas chat.', 0.20),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-006', '2026-05-18', 'Lina', 'Print Brosur Lipat 3 Artpaper', 500, 1200, 600000, 'Hasil cetakan buram, warnanya tidak sesuai dengan file desain yang dikirim. Kecewa.', -0.65),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-007', '2026-05-22', 'Zul', 'X-Banner Stand + Banner', 1, 85000, 85000, 'Tiang stand X penyangga agak ringkih mudah goyang, tapi cetakan bannernya bagus.', 0.12),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-008', '2026-05-25', 'Ratih', 'Cetak Sertifikat Kertas Aster', 50, 4000, 200000, 'Warna cetak emas mewah, pengerjaan cepat ditunggu bisa langsung jadi.', 0.80),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-009', '2026-05-27', 'Bobi', 'Print Warna A3 HVS', 30, 3000, 90000, 'Cetak warna ok, harga standar percetakan mahasiswa.', 0.50),
  ('e004e004-e004-e004-e004-e004e004e004', 'ORD-010', '2026-05-30', 'Ambar', 'Cetak Poster A2 Art Carton', 5, 35000, 175000, 'Kertas poster penyok di bagian pojok karena packing kurang aman saat diambil.', -0.30);

-- Luthfia (e005e005-e005-e005-e005-e005e005e005)
INSERT INTO public.transactions (umkm_id, order_number, date, customer_name, item_name, quantity, price, amount, review_text, sentiment_score)
VALUES
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-001', '2026-05-02', 'Sari', 'Facial Glow Treatment', 1, 150000, 150000, 'Terapisnya lembut memijat wajah, tempat bersih sekali. Kulit langsung kerasa segar.', 0.85),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-002', '2026-05-05', 'Wulan', 'Serum Acne Clear (20ml)', 2, 95000, 190000, 'Serumnya ampuh meredakan jerawat aktif dalam 3 hari pemakaian. Sangat suka.', 0.80),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-003', '2026-05-10', 'Nisa', 'Hair Spa Aloe Vera & Blow', 1, 120000, 120000, 'Rambut jadi halus berkilau, wangi lidah buayanya awet 2 hari.', 0.82),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-004', '2026-05-13', 'Gita', 'Sunscreen SPF 50 Pa++++', 3, 75000, 225000, 'Sunscreen ringan cepat meresap di kulit berminyak, tidak menimbulkan whitecast.', 0.78),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-005', '2026-05-15', 'Tika', 'Body Scrub Sakura Lulur', 2, 60000, 120000, 'Butiran scrubnya halus tidak bikin sakit kulit, wangi bunga sakura manis.', 0.75),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-006', '2026-05-18', 'Yeni', 'Manicure Pedicure Spa', 1, 90000, 90000, 'Kuku dipotong rapi dan bersih. Pijatan tangannya menenangkan.', 0.80),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-007', '2026-05-22', 'Rara', 'Brightening Day Cream', 1, 85000, 85000, 'Krim pagi melembabkan kulit dengan baik, wajah terlihat cerah alami.', 0.76),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-008', '2026-05-25', 'Dona', 'Facial totok Wajah', 1, 110000, 110000, 'Tekanan totok wajah pas, melancarkan peredaran darah bikin rileks ngantuk.', 0.84),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-009', '2026-05-27', 'Resti', 'Micellar Water Hydrating', 2, 45000, 90000, 'Mengangkat makeup waterproof dengan bersih tanpa membuat kulit kering ketarik.', 0.80),
  ('e005e005-e005-e005-e005-e005e005e005', 'ORD-010', '2026-05-30', 'Oka', 'Eyelash Extension Natural', 1, 180000, 180000, 'Bulu mata sambungan ringan seperti asli, lem tidak perih di mata.', 0.83);

-- Prayata (e006e006-e006-e006-e006-e006e006e006)
INSERT INTO public.transactions (umkm_id, order_number, date, customer_name, item_name, quantity, price, amount, review_text, sentiment_score)
VALUES
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-001', '2026-05-02', 'Laras', 'Gantungan Kunci Kayu Ukir Custom', 10, 15000, 150000, 'Ukiran kayu gantungan kunci kurang rapi, nama pesanan ada typo penulisan.', -0.30),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-002', '2026-05-04', 'Dwi', 'Tas Rajut Benang Katun Selempang', 1, 120000, 120000, 'Tas rajutan rapi dan warna benang cantik, tapi pengiriman paket telat 3 hari.', -0.15),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-003', '2026-05-09', 'Siska', 'Hiasan Dinding Makrame Daun', 2, 75000, 150000, 'Makramenya bagus dipajang di ruang tamu, benang tebal berkualitas.', 0.65),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-004', '2026-05-12', 'Arif', 'Kotak Tisu Kayu Pinus Rustic', 5, 35000, 175000, 'Kotak tisu kayu rustic baunya masih cat menyengat, pengerjaan amplas kurang halus.', -0.40),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-005', '2026-05-15', 'Iwan', 'Tatakan Gelas Resin Bunga Kering', 4, 25000, 100000, 'Resin tatakan gelas ada gelembung udara kecil-kecil di dalamnya, kurang jernih.', -0.25),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-006', '2026-05-18', 'Endah', 'Bros Hijab Rajut Bunga Mawar', 20, 5000, 100000, 'Bros rajut imut dan lucu. Cocok dibagikan untuk suvenir pernikahan.', 0.70),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-007', '2026-05-21', 'Rahmat', 'Lukisan Siluet Wajah di Kayu', 1, 180000, 180000, 'Pesanan siluet kayu pengerjaannya lama sekali, admin lambat membalas keluhan.', -0.35),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-008', '2026-05-24', 'Lia', 'Dompet Koin Rajut Karakter Animal', 8, 12000, 96000, 'Dompet koin mungil lucu, tapi resletingnya agak sedikit macet saat dibuka.', -0.10),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-009', '2026-05-27', 'Bayu', 'Lampu Tidur Hias Bambu Ukir', 1, 150000, 150000, 'Pancaran cahaya bambu ukir estetik sekali di malam hari, fitting lampu aman.', 0.80),
  ('e006e006-e006-e006-e006-e006e006e006', 'ORD-010', '2026-05-30', 'Asti', 'Gelang Tangan Rajut Etnik', 10, 8000, 80000, 'Tali gelang rajut kasar gatal jika dipakai di kulit tangan sensitif.', -0.20);
