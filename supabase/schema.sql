-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create custom types
CREATE TYPE memo_type AS ENUM ('annual_review', 'refinancing', 'new_deal', 'amendment');
CREATE TYPE document_type AS ENUM ('financial_statement', 'balance_sheet', 'cash_flow', 'income_statement');
CREATE TYPE pov_style AS ENUM ('dual_alternating', 'single', 'multiple');
CREATE TYPE tense_type AS ENUM ('past', 'present');
CREATE TYPE beat_type AS ENUM ('setup', 'inciting_incident', 'rising_action', 'climax', 'falling_action', 'resolution');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    google_tokens JSONB,
    notion_workspace_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Companies table
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    industry TEXT,
    notion_page_id TEXT,
    google_drive_folder_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial data table
CREATE TABLE public.financial_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    document_type document_type NOT NULL,
    original_filename TEXT,
    file_path TEXT,
    google_drive_file_id TEXT,
    google_drive_link TEXT,
    extracted_data TEXT,
    ocr_confidence DECIMAL(5,2),
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit memos table
CREATE TABLE public.credit_memos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    memo_type memo_type NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    financial_metrics JSONB,
    notion_page_id TEXT,
    google_drive_backup_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Novels table
CREATE TABLE public.novels (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    pov_style pov_style DEFAULT 'dual_alternating',
    tense tense_type DEFAULT 'past',
    target_chapters INTEGER DEFAULT 25,
    target_beats INTEGER DEFAULT 250,
    current_word_count INTEGER DEFAULT 0,
    notion_page_id TEXT,
    google_drive_folder_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters table
CREATE TABLE public.chapters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    chapter_number INTEGER NOT NULL,
    title TEXT,
    pov_character TEXT,
    summary TEXT,
    content TEXT,
    word_count INTEGER DEFAULT 0,
    google_drive_backup_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(novel_id, chapter_number)
);

-- Story beats table
CREATE TABLE public.story_beats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    novel_id UUID REFERENCES public.novels(id) ON DELETE CASCADE NOT NULL,
    chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    beat_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    beat_type beat_type,
    pov_character TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync logs table (track sync status with external services)
CREATE TABLE public.sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    entity_type TEXT NOT NULL, -- 'company', 'novel', 'credit_memo', etc.
    entity_id UUID NOT NULL,
    service TEXT NOT NULL, -- 'notion', 'google_drive'
    action TEXT NOT NULL, -- 'create', 'update', 'delete'
    status TEXT NOT NULL, -- 'pending', 'success', 'failed'
    error_message TEXT,
    external_id TEXT, -- ID in external service
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_beats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Companies
CREATE POLICY "Users can manage own companies" ON public.companies
    FOR ALL USING (auth.uid() = user_id);

-- Financial Data
CREATE POLICY "Users can manage own financial data" ON public.financial_data
    FOR ALL USING (auth.uid() = user_id);

-- Credit Memos
CREATE POLICY "Users can manage own credit memos" ON public.credit_memos
    FOR ALL USING (auth.uid() = user_id);

-- Novels
CREATE POLICY "Users can manage own novels" ON public.novels
    FOR ALL USING (auth.uid() = user_id);

-- Chapters
CREATE POLICY "Users can manage own chapters" ON public.chapters
    FOR ALL USING (auth.uid() = user_id);

-- Story Beats
CREATE POLICY "Users can manage own story beats" ON public.story_beats
    FOR ALL USING (auth.uid() = user_id);

-- Sync Logs
CREATE POLICY "Users can manage own sync logs" ON public.sync_logs
    FOR ALL USING (auth.uid() = user_id);

-- Functions and Triggers
-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER handle_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_credit_memos_updated_at
    BEFORE UPDATE ON public.credit_memos
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_novels_updated_at
    BEFORE UPDATE ON public.novels
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_chapters_updated_at
    BEFORE UPDATE ON public.chapters
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_story_beats_updated_at
    BEFORE UPDATE ON public.story_beats
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Indexes for performance
CREATE INDEX idx_companies_user_id ON public.companies(user_id);
CREATE INDEX idx_financial_data_company_id ON public.financial_data(company_id);
CREATE INDEX idx_financial_data_user_id ON public.financial_data(user_id);
CREATE INDEX idx_credit_memos_company_id ON public.credit_memos(company_id);
CREATE INDEX idx_credit_memos_user_id ON public.credit_memos(user_id);
CREATE INDEX idx_novels_user_id ON public.novels(user_id);
CREATE INDEX idx_chapters_novel_id ON public.chapters(novel_id);
CREATE INDEX idx_chapters_user_id ON public.chapters(user_id);
CREATE INDEX idx_story_beats_novel_id ON public.story_beats(novel_id);
CREATE INDEX idx_story_beats_chapter_id ON public.story_beats(chapter_id);
CREATE INDEX idx_story_beats_user_id ON public.story_beats(user_id);
CREATE INDEX idx_sync_logs_user_id ON public.sync_logs(user_id);
CREATE INDEX idx_sync_logs_entity ON public.sync_logs(entity_type, entity_id);