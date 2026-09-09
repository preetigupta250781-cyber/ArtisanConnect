-- Supabase Schema for ArtisanConnect

-- ==========================================
-- 1. Create Tables
-- ==========================================

CREATE TABLE artisans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID REFERENCES artisans(id) ON DELETE CASCADE,
    image_url TEXT,
    title_en TEXT,
    description_en TEXT,
    title_hi TEXT,
    description_hi TEXT,
    keywords TEXT[],
    price_min INT,
    price_max INT,
    final_price INT,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 2. Storage Setup (Manual Steps via Dashboard)
-- ==========================================
/*
Since Supabase storage buckets cannot be easily created using the SQL Editor, 
follow these manual steps in the Supabase Dashboard:

1. Go to "Storage" in the left sidebar.
2. Click "New Bucket".
3. Name it "product-images".
4. Toggle "Public bucket" to ON.
5. Click "Save".
6. (Optional) In "Policies", click "New Policy" -> "Get started quickly" -> "Enable read access to everyone" and "Enable insert access for authenticated users" (or everyone for this hackathon demo).
*/
