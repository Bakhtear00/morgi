import React, { useState } from 'react';
import { Clipboard, Check, Database, AlertTriangle } from 'lucide-react';
import { BENGALI_TEXT } from '../constants.tsx';

interface DatabaseSetupGuideProps {
    onSetupComplete: () => void;
}

const SQL_SCRIPT = `-- =================================================================
-- ===         পোল্ট্রি শপ ম্যানেজমেন্ট - ডাটাবেস সেটআপ         ===
-- =================================================================
-- এই কোডটি এখন থেকে যতবার খুশি রান করা যাবে, কোনো error হবে না।
-- এটি নিজে থেকেই চেক করে নিবে কোনো টেবিল বা পলিসি আগে থেকে তৈরি আছে কিনা।

-- ধাপ ১: আপনার অ্যাপের জন্য ডেটা টেবিলগুলো তৈরি করুন।

-- এই টেবিলটি ব্যবহারকারীর ইউজারনেম এবং অন্যান্য তথ্য সংরক্ষণ করবে।
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- মুরগি কেনার হিসাব রাখার জন্য টেবিল।
CREATE TABLE IF NOT EXISTS purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL,
  pieces INT NOT NULL,
  kg NUMERIC NOT NULL,
  rate NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  date DATE NOT NULL,
  is_credit BOOLEAN DEFAULT FALSE
);

-- মুরগি বিক্রির হিসাব রাখার জন্য টেবিল।
CREATE TABLE IF NOT EXISTS sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL,
  pieces INT,
  kg NUMERIC,
  rate NUMERIC,
  mortality INT DEFAULT 0,
  total NUMERIC NOT NULL,
  date DATE NOT NULL,
  is_cash BOOLEAN DEFAULT TRUE
);

-- অন্যান্য খরচের হিসাব রাখার জন্য টেবিল।
CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  note TEXT,
  date DATE NOT NULL
);

-- বাকির হিসাব রাখার জন্য টেবিল।
CREATE TABLE IF NOT EXISTS dues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  customer_name TEXT NOT NULL,
  mobile TEXT,
  address TEXT,
  amount NUMERIC NOT NULL,
  paid NUMERIC DEFAULT 0,
  date DATE NOT NULL
);

-- ক্যাশ টাকার হিসাব রাখার জন্য টেবিল।
CREATE TABLE IF NOT EXISTS cash_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('OPENING', 'ADD', 'WITHDRAW')),
  amount NUMERIC NOT NULL,
  date DATE NOT NULL,
  note TEXT,
  denominations JSONB
);

-- সম্পন্ন হওয়া লটের হিসাব আর্কাইভ করার জন্য টেবিল।
CREATE TABLE IF NOT EXISTS lot_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  type TEXT NOT NULL,
  total_purchase NUMERIC NOT NULL,
  total_sale NUMERIC NOT NULL,
  profit NUMERIC NOT NULL
);

-- স্টক রিসেট করার সময় মনে রাখার জন্য টেবিল।
CREATE TABLE IF NOT EXISTS user_resets (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    poultry_type TEXT NOT NULL,
    last_reset_time TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, poultry_type)
);

-- ধাপ ২: প্রতিটি টেবিলে Row Level Security (RLS) চালু করুন।
-- এটি নিশ্চিত করে যে ব্যবহারকারীরা শুধুমাত্র তাদের নিজেদের ডেটা দেখতে ও পরিবর্তন করতে পারবে।

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lot_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_resets ENABLE ROW LEVEL SECURITY;

-- ধাপ ৩: ব্যবহারকারীদের নিজেদের ডেটা ম্যানেজ করার জন্য পলিসি তৈরি করুন।

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের প্রোফাইল ম্যানেজ করতে পারবে" ON profiles;
CREATE POLICY "ব্যবহারকারী তার নিজের প্রোফাইল ম্যানেজ করতে পারবে" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের কেনা-বেচার হিসাব ম্যানেজ করতে পারবে" ON purchases;
CREATE POLICY "ব্যবহারকারী তার নিজের কেনা-বেচার হিসাব ম্যানেজ করতে পারবে" ON purchases FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের বিক্রির হিসাব ম্যানেজ করতে পারবে" ON sales;
CREATE POLICY "ব্যবহারকারী তার নিজের বিক্রির হিসাব ম্যানেজ করতে পারবে" ON sales FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের খরচের হিসাব ম্যানেজ করতে পারবে" ON expenses;
CREATE POLICY "ব্যবহারকারী তার নিজের খরচের হিসাব ম্যানেজ করতে পারবে" ON expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের বাকির হিসাব ম্যানেজ করতে পারবে" ON dues;
CREATE POLICY "ব্যবহারকারী তার নিজের বাকির হিসাব ম্যানেজ করতে পারবে" ON dues FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের ক্যাশ হিসাব ম্যানেজ করতে পারবে" ON cash_logs;
CREATE POLICY "ব্যবহারকারী তার নিজের ক্যাশ হিসাব ম্যানেজ করতে পারবে" ON cash_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের লট আর্কাইভ ম্যানেজ করতে পারবে" ON lot_archives;
CREATE POLICY "ব্যবহারকারী তার নিজের লট আর্কাইভ ম্যানেজ করতে পারবে" ON lot_archives FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ব্যবহারকারী তার নিজের রিসেট টাইমস্ট্যাম্প ম্যানেজ করতে পারবে" ON user_resets;
CREATE POLICY "ব্যবহারকারী তার নিজের রিসেট টাইমস্ট্যাম্প ম্যানেজ করতে পারবে" ON user_resets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =================================================================
-- ===          গুরুত্বপূর্ণ: লগইন এবং পারফরম্যান্স           ===
-- =================================================================

-- ধাপ ৪: ইউজারনেম থেকে ইমেইল খুঁজে বের করার জন্য একটি বিশেষ ফাংশন (RPC) তৈরি করুন।
-- এই ফাংশনটি না থাকলে ইউজারনেম দিয়ে লগইন কাজ করবে না।
-- 'SECURITY DEFINER' ব্যবহার করা হয়েছে যাতে এই ফাংশনটি auth.users টেবিল থেকে ইমেইল পড়তে পারে।

CREATE OR REPLACE FUNCTION get_email_for_username(p_username TEXT)
RETURNS TEXT AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- 'profiles' টেবিল থেকে ইউজারনেম ব্যবহার করে 'auth.users' টেবিল থেকে সংশ্লিষ্ট ইমেইলটি খুঁজে বের করুন।
  SELECT u.email INTO v_email
  FROM auth.users u
  JOIN public.profiles p ON u.id = p.id
  WHERE p.username = p_username;
  
  -- পাওয়া ইমেইলটি রিটার্ন করুন।
  RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ধাপ ৫: ডাটাবেস পারফরম্যান্স বাড়ানোর জন্য ইনডেক্স তৈরি করুন।
-- এই ইনডেক্সগুলো ডেটা খোঁজার গতি বাড়িয়ে অ্যাপটিকে আরও ফাস্ট করবে।
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(date);
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_dues_user_id ON dues(user_id);
CREATE INDEX IF NOT EXISTS idx_dues_date ON dues(date);
CREATE INDEX IF NOT EXISTS idx_cash_logs_user_id ON cash_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_logs_date ON cash_logs(date);
CREATE INDEX IF NOT EXISTS idx_lot_archives_user_id ON lot_archives(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
`;

const DatabaseSetupGuide: React.FC<DatabaseSetupGuideProps> = ({ onSetupComplete }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(SQL_SCRIPT);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-3xl border-2 border-yellow-200">
                <div className="text-center mb-6">
                    <Database className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-black text-gray-800">{BENGALI_TEXT.dbSetupTitle}</h1>
                    <p className="text-gray-500 mt-2">{BENGALI_TEXT.dbSetupInstructions}</p>
                </div>

                <div className="relative bg-gray-900 text-white p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-64 border border-gray-700">
                    <button onClick={copyToClipboard} className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-lg flex items-center gap-2 text-xs">
                        {copied ? <Check size={14} /> : <Clipboard size={14} />}
                        {copied ? 'কপি হয়েছে!' : 'কপি করুন'}
                    </button>
                    <pre><code>{SQL_SCRIPT}</code></pre>
                </div>
                
                <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-bold text-yellow-800">গুরুত্বপূর্ণ নোট</h3>
                            <div className="mt-2 text-sm text-yellow-700 space-y-2">
                                <p>
                                    যদি আপনি এই SQL কোড রান করার <strong>আগে</strong> কোনো ব্যবহারকারী তৈরি করে থাকেন, তবে সেই ব্যবহারকারী লগইন করতে পারবে না। সেক্ষেত্রে, আপনাকে Supabase-এর Table Editor-এ গিয়ে <code>profiles</code> টেবিলে সেই ব্যবহারকারীর জন্য ম্যানুয়ালি একটি সারি যোগ করতে হবে।
                                </p>
                                <p>
                                    উপরের কোডটি রান করার পর, এই পেজটি রিফ্রেশ করতে নিচের বাটনে ক্লিক করুন।
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <button onClick={onSetupComplete} className="mt-6 w-full bg-green-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-green-700 active:scale-95 transition-all">
                    সেটআপ সম্পন্ন হয়েছে, রিফ্রেশ করুন
                </button>
            </div>
        </div>
    );
};

export default DatabaseSetupGuide;