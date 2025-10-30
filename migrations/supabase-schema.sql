-- Supabase Database Schema Migration
-- Run this script in your Supabase SQL editor to set up the database tables

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    industry TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Financial data table
CREATE TABLE IF NOT EXISTS financial_data (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    document_type TEXT,
    file_path TEXT,
    extracted_data TEXT,
    upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit memos table
CREATE TABLE IF NOT EXISTS credit_memos (
    id BIGSERIAL PRIMARY KEY,
    company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
    memo_type TEXT,
    title TEXT,
    content TEXT,
    financial_metrics JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Novels table
CREATE TABLE IF NOT EXISTS novels (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    pov_style TEXT DEFAULT 'dual_alternating',
    tense TEXT DEFAULT 'past',
    target_chapters INTEGER DEFAULT 25,
    target_beats INTEGER DEFAULT 250,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
    id BIGSERIAL PRIMARY KEY,
    novel_id BIGINT REFERENCES novels(id) ON DELETE CASCADE,
    chapter_number INTEGER,
    title TEXT,
    pov_character TEXT,
    summary TEXT,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Story beats table
CREATE TABLE IF NOT EXISTS story_beats (
    id BIGSERIAL PRIMARY KEY,
    novel_id BIGINT REFERENCES novels(id) ON DELETE CASCADE,
    chapter_id BIGINT REFERENCES chapters(id) ON DELETE SET NULL,
    beat_number INTEGER,
    description TEXT,
    beat_type TEXT,
    pov_character TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_data_company_id ON financial_data(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_memos_company_id ON credit_memos(company_id);
CREATE INDEX IF NOT EXISTS idx_chapters_novel_id ON chapters(novel_id);
CREATE INDEX IF NOT EXISTS idx_story_beats_novel_id ON story_beats(novel_id);
CREATE INDEX IF NOT EXISTS idx_story_beats_chapter_id ON story_beats(chapter_id);

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_memos ENABLE ROW LEVEL SECURITY;
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_beats ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON companies FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON companies FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON companies FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON financial_data FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON financial_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON financial_data FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON financial_data FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON credit_memos FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON credit_memos FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON credit_memos FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON credit_memos FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON novels FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON novels FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON novels FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON novels FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON chapters FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON chapters FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON chapters FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON chapters FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON story_beats FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON story_beats FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON story_beats FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON story_beats FOR DELETE USING (true);

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('workspace-files', 'workspace-files', true);

-- Create storage policies
CREATE POLICY "Enable read access for all users" ON storage.objects FOR SELECT USING (bucket_id = 'workspace-files');
CREATE POLICY "Enable insert access for all users" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'workspace-files');
CREATE POLICY "Enable update access for all users" ON storage.objects FOR UPDATE USING (bucket_id = 'workspace-files');
CREATE POLICY "Enable delete access for all users" ON storage.objects FOR DELETE USING (bucket_id = 'workspace-files');