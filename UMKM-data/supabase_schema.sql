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

-- ─── SEED DEMO USERS (Stored Procedure) ───────────────────────────────────
-- Run: SELECT seed_demo_users();
-- This creates all 6 demo accounts safely via auth.users with correct fields.

CREATE OR REPLACE FUNCTION public.seed_demo_users()
RETURNS TEXT AS $$
DECLARE
  v_user_id UUID;
  v_umkm_id UUID;
  v_email TEXT;
  v_name TEXT;
  v_password TEXT;
  v_umkm_name TEXT;
  v_sector TEXT;
  v_location TEXT;
  v_base_rev NUMERIC;
  v_base_exp NUMERIC;
  i INT;
  v_month TEXT;
  v_months TEXT[] := ARRAY['Jan 2025','Feb 2025','Mar 2025','Apr 2025','Mei 2025','Jun 2025',
                            'Jul 2025','Agu 2025','Sep 2025','Okt 2025','Nov 2025','Des 2025',
                            'Jan 2026','Feb 2026','Mar 2026','Apr 2026','Mei 2026'];
  v_products TEXT[];
  v_reviews_pos TEXT[];
  v_reviews_neg TEXT[];
  v_customers TEXT[] := ARRAY['Rudi Santoso','Siti Aminah','Budi Prasetyo','Dewi Rahayu',
                               'Joko Widodo','Ani Puspita','Eko Wahyono','Sari Indrawati',
                               'Giri Haryanto','Yanto Susilo','Rina Marlina','Tono Subagyo',
                               'Lina Kusuma','Hadi Purnomo','Maya Saputri','Dian Permata',
                               'Bimo Satrio','Indah Lestari','Agus Wibowo','Soni Darmawan'];
  users_data RECORD;
BEGIN

  FOR users_data IN
    SELECT * FROM (VALUES
      ('andi@uhp.id',    'andi123',    'Andi',                  'Warung Makan Pak Andi',      'Kuliner',    'Bandung',   15000000, 9500000),
      ('zaky@uhp.id',    'zaky123',    'Zaky Muhammad Fauzi',   'Dewa IT',                    'Teknologi',  'Jakarta',   22000000, 13000000),
      ('brama@uhp.id',   'brama123',   'Brama Hartoyo',         'Brama Fashion Store',        'Fashion',    'Surabaya',  12000000, 7800000),
      ('ghifary@uhp.id', 'ghifary123', 'Ghifary Wibisono',      'Ghifary Craft & Art',        'Kerajinan',  'Yogyakarta',8000000,  5200000),
      ('luthfia@uhp.id', 'luthfia123', 'Luthfia Maulidya Izzati','Luthfia Beauty Studio',     'Kecantikan', 'Semarang',  18000000, 11000000),
      ('prayata@uhp.id', 'prayata123', 'Prayata Yasinkha Adnien','Prayata Consulting Group',  'Jasa',       'Malang',    20000000, 12000000)
    ) AS t(email, pass, full_name, umkm_name, sector, location, base_rev, base_exp)
  LOOP
    v_email    := users_data.email;
    v_name     := users_data.full_name;
    v_password := users_data.pass;
    v_umkm_name:= users_data.umkm_name;
    v_sector   := users_data.sector;
    v_location := users_data.location;
    v_base_rev := users_data.base_rev;
    v_base_exp := users_data.base_exp;

    -- Skip if already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    IF v_user_id IS NOT NULL THEN
      CONTINUE;
    END IF;

    -- Insert into auth.users with all required fields
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, confirmation_token, recovery_token,
      email_change, email_change_token_new, raw_app_meta_data,
      raw_user_meta_data, created_at, updated_at, last_sign_in_at,
      confirmation_sent_at, is_super_admin, phone, phone_confirmed_at,
      phone_change, phone_change_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      NOW(),
      '', '', '', '',
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', v_name),
      NOW(), NOW(), NOW(), NOW(),
      FALSE, NULL, NULL, '', ''
    );

    -- Trigger will create profile; wait a tick by selecting
    PERFORM pg_sleep(0);

    -- Insert UMKM profile
    v_umkm_id := gen_random_uuid();
    INSERT INTO public.umkm_profiles (id, user_id, name, sector, location, tenure, current_class)
    VALUES (v_umkm_id, v_user_id, v_umkm_name, v_sector, v_location, 17, 'Elite');

    -- Sector-based products and reviews
    IF v_sector = 'Kuliner' THEN
      v_products   := ARRAY['Nasi Goreng Spesial','Ayam Bakar Madu','Es Teh Manis','Mie Ayam Jumbo','Sate 10 Tusuk','Paket Nasi + Ayam'];
      v_reviews_pos:= ARRAY['Makanan selalu enak dan porsi besar!','Rasa konsisten mantap, pasti balik lagi!','Tempat favorit keluarga, bersih dan ramah.'];
      v_reviews_neg:= ARRAY['Porsi agak kurang untuk harganya.','Agak lama nunggu saat ramai.'];
    ELSIF v_sector = 'Teknologi' THEN
      v_products   := ARRAY['Servis Laptop','Repair Handphone','Setup Jaringan','Data Recovery','Upgrade RAM','Konsultasi IT'];
      v_reviews_pos:= ARRAY['Pelayanan profesional dan cepat!','Teknisinya ramah dan transparan soal biaya.','Tim kompeten, tidak ada biaya tersembunyi.'];
      v_reviews_neg:= ARRAY['Estimasi waktu agak lama, tapi hasilnya bagus.','Antrian cukup panjang.'];
    ELSIF v_sector = 'Fashion' THEN
      v_products   := ARRAY['Kemeja Batik','Dress Casual','Celana Chino','Jaket Hoodie','Kaos Polos','Rok Midi'];
      v_reviews_pos:= ARRAY['Kualitas bahan bagus dan jahitan rapi!','Model trendy, harga worth it.','Pengiriman cepat, produk sesuai foto.'];
      v_reviews_neg:= ARRAY['Stok warna favorit sering habis.','Sizing agak kecil dari perkiraan.'];
    ELSIF v_sector = 'Kerajinan' THEN
      v_products   := ARRAY['Tas Anyaman','Lukisan Kanvas','Hiasan Dinding','Gelang Manik','Lilin Aromaterapi','Boneka Rajut'];
      v_reviews_pos:= ARRAY['Kerajinannya sangat detail dan berkualitas!','Tas anyamannya kuat dan unik.','Produk handmade yang terasa nilai seninya.'];
      v_reviews_neg:= ARRAY['Proses agak lama karena handmade, tapi hasilnya bagus.','Warna sedikit berbeda dari foto.'];
    ELSIF v_sector = 'Kecantikan' THEN
      v_products   := ARRAY['Facial Treatment','Creambath Rambut','Manikur Pedikur','Hair Coloring','Body Scrub','Make Up Natural'];
      v_reviews_pos:= ARRAY['Perawatan wajahnya luar biasa, kulit lebih cerah!','Mbaknya sangat ahli dan ramah.','Tempatnya nyaman dan bersih.'];
      v_reviews_neg:= ARRAY['Antrean panjang di weekend, tapi hasilnya sepadan.','Harga sedikit mahal tapi kualitas premium.'];
    ELSE -- Jasa
      v_products   := ARRAY['Konsultasi Bisnis','Desain Logo','Pembuatan Website','Foto Produk','Digital Marketing','Akuntansi Bulanan'];
      v_reviews_pos:= ARRAY['Sangat insight! Bisnis saya berkembang pesat.','Desain logonya profesional dan sesuai visi.','Tim kompeten, deadline ketat terpenuhi.'];
      v_reviews_neg:= ARRAY['Revisi desain agak memakan waktu.','Harga tinggi tapi sebanding kualitasnya.'];
    END IF;

    -- Insert 17 months of history
    FOR i IN 1..17 LOOP
      v_month := v_months[i];
      INSERT INTO public.umkm_history (umkm_id, month, revenue, expenses, transactions, sentiment, class)
      VALUES (
        v_umkm_id,
        v_month,
        ROUND((v_base_rev * (1 + (i * 0.035) + (sin(i * 0.8) * 0.08)))::NUMERIC, -3),
        ROUND((v_base_exp * (1 + (i * 0.028) + (sin(i * 0.9) * 0.06)))::NUMERIC, -3),
        75 + (i * 4) + (FLOOR(RANDOM() * 20) - 10)::INT,
        ROUND((0.45 + RANDOM() * 0.45)::NUMERIC, 2),
        CASE WHEN i > 10 THEN 'Elite' WHEN i > 5 THEN 'Growth' ELSE 'Growth' END
      );
    END LOOP;

    -- Insert 20 transactions
    FOR i IN 1..20 LOOP
      INSERT INTO public.transactions (
        umkm_id, order_number, date, customer_name, item_name,
        quantity, price, amount, review_text, sentiment_score
      ) VALUES (
        v_umkm_id,
        'ORD-' || LPAD(i::TEXT, 3, '0'),
        (CURRENT_DATE - ((i * 2) || ' days')::INTERVAL)::DATE,
        v_customers[((i - 1) % 20) + 1],
        v_products[((i - 1) % array_length(v_products, 1)) + 1],
        (FLOOR(RANDOM() * 3) + 1)::INT,
        CASE v_sector
          WHEN 'Kuliner' THEN ((FLOOR(RANDOM() * 4) + 1) * 10000)::NUMERIC
          WHEN 'Teknologi' THEN ((FLOOR(RANDOM() * 5) + 1) * 50000)::NUMERIC
          WHEN 'Kecantikan' THEN ((FLOOR(RANDOM() * 4) + 2) * 35000)::NUMERIC
          WHEN 'Fashion' THEN ((FLOOR(RANDOM() * 5) + 1) * 45000)::NUMERIC
          ELSE ((FLOOR(RANDOM() * 5) + 1) * 25000)::NUMERIC
        END,
        CASE v_sector
          WHEN 'Kuliner' THEN ((FLOOR(RANDOM() * 4) + 1) * 10000 * (FLOOR(RANDOM() * 3) + 1))::NUMERIC
          ELSE ((FLOOR(RANDOM() * 5) + 1) * 50000 * (FLOOR(RANDOM() * 2) + 1))::NUMERIC
        END,
        CASE WHEN RANDOM() > 0.25
          THEN v_reviews_pos[(FLOOR(RANDOM() * array_length(v_reviews_pos, 1)) + 1)::INT]
          ELSE v_reviews_neg[(FLOOR(RANDOM() * array_length(v_reviews_neg, 1)) + 1)::INT]
        END,
        CASE WHEN RANDOM() > 0.25
          THEN ROUND((0.3 + RANDOM() * 0.65)::NUMERIC, 2)
          ELSE ROUND((-0.15 - RANDOM() * 0.35)::NUMERIC, 2)
        END
      );
    END LOOP;

  END LOOP;

  RETURN 'Seeding selesai! 6 demo user berhasil dibuat dengan data lengkap.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── JALANKAN SEEDING ──────────────────────────────────────────────────────
-- Uncomment baris di bawah ini, lalu klik Run:
-- SELECT seed_demo_users();
