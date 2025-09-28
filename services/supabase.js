const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class SupabaseService {
    constructor() {
        this.supabase = null;
        this.initializeClient();
    }

    initializeClient() {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
            console.log('Supabase credentials not configured. Skipping Supabase initialization.');
            return;
        }

        try {
            this.supabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_ANON_KEY,
                {
                    auth: {
                        persistSession: false
                    }
                }
            );
            console.log('Supabase client initialized successfully');
        } catch (error) {
            console.error('Error initializing Supabase client:', error);
        }
    }

    async createTables() {
        if (!this.supabase) return;

        // Note: These tables should ideally be created through Supabase dashboard
        // This is just for reference of the schema
        const tables = {
            companies: `
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                name text NOT NULL,
                industry text,
                created_at timestamp with time zone DEFAULT now(),
                updated_at timestamp with time zone DEFAULT now()
            `,
            financial_data: `
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                company_id uuid REFERENCES companies(id),
                document_type text,
                file_url text,
                extracted_data jsonb,
                upload_date timestamp with time zone DEFAULT now()
            `,
            credit_memos: `
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                company_id uuid REFERENCES companies(id),
                memo_type text,
                title text,
                content text,
                financial_metrics jsonb,
                notion_page_id text,
                created_at timestamp with time zone DEFAULT now()
            `,
            novels: `
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                title text NOT NULL,
                description text,
                pov_style text DEFAULT 'dual_alternating',
                tense text DEFAULT 'past',
                target_chapters integer DEFAULT 25,
                target_beats integer DEFAULT 250,
                notion_page_id text,
                created_at timestamp with time zone DEFAULT now()
            `,
            chapters: `
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                novel_id uuid REFERENCES novels(id),
                chapter_number integer,
                title text,
                pov_character text,
                summary text,
                word_count integer DEFAULT 0,
                google_doc_id text,
                created_at timestamp with time zone DEFAULT now()
            `,
            story_beats: `
                id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
                novel_id uuid REFERENCES novels(id),
                chapter_id uuid REFERENCES chapters(id),
                beat_number integer,
                description text,
                beat_type text,
                pov_character text,
                created_at timestamp with time zone DEFAULT now()
            `
        };

        console.log('Tables should be created in Supabase dashboard with the provided schema');
    }

    // Company operations
    async getCompanies() {
        if (!this.supabase) return [];
        
        const { data, error } = await this.supabase
            .from('companies')
            .select('*')
            .order('name');
        
        if (error) {
            console.error('Error fetching companies:', error);
            return [];
        }
        return data;
    }

    async createCompany(company) {
        if (!this.supabase) return null;
        
        const { data, error } = await this.supabase
            .from('companies')
            .insert([company])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating company:', error);
            return null;
        }
        return data;
    }

    // Financial data operations
    async uploadFinancialData(financialData) {
        if (!this.supabase) return null;
        
        const { data, error } = await this.supabase
            .from('financial_data')
            .insert([financialData])
            .select()
            .single();
        
        if (error) {
            console.error('Error uploading financial data:', error);
            return null;
        }
        return data;
    }

    // Credit memo operations
    async createCreditMemo(memo) {
        if (!this.supabase) return null;
        
        const { data, error } = await this.supabase
            .from('credit_memos')
            .insert([memo])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating credit memo:', error);
            return null;
        }
        return data;
    }

    async getCreditMemos(companyId = null) {
        if (!this.supabase) return [];
        
        let query = this.supabase.from('credit_memos').select('*');
        
        if (companyId) {
            query = query.eq('company_id', companyId);
        }
        
        const { data, error } = await query.order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching credit memos:', error);
            return [];
        }
        return data;
    }

    // Novel operations
    async getNovels() {
        if (!this.supabase) return [];
        
        const { data, error } = await this.supabase
            .from('novels')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Error fetching novels:', error);
            return [];
        }
        return data;
    }

    async createNovel(novel) {
        if (!this.supabase) return null;
        
        const { data, error } = await this.supabase
            .from('novels')
            .insert([novel])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating novel:', error);
            return null;
        }
        return data;
    }

    // Chapter operations
    async getChapters(novelId) {
        if (!this.supabase) return [];
        
        const { data, error } = await this.supabase
            .from('chapters')
            .select('*')
            .eq('novel_id', novelId)
            .order('chapter_number');
        
        if (error) {
            console.error('Error fetching chapters:', error);
            return [];
        }
        return data;
    }

    async createChapter(chapter) {
        if (!this.supabase) return null;
        
        const { data, error } = await this.supabase
            .from('chapters')
            .insert([chapter])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating chapter:', error);
            return null;
        }
        return data;
    }

    // Story beats operations
    async getStoryBeats(novelId) {
        if (!this.supabase) return [];
        
        const { data, error } = await this.supabase
            .from('story_beats')
            .select('*')
            .eq('novel_id', novelId)
            .order('beat_number');
        
        if (error) {
            console.error('Error fetching story beats:', error);
            return [];
        }
        return data;
    }

    async createStoryBeat(beat) {
        if (!this.supabase) return null;
        
        const { data, error } = await this.supabase
            .from('story_beats')
            .insert([beat])
            .select()
            .single();
        
        if (error) {
            console.error('Error creating story beat:', error);
            return null;
        }
        return data;
    }

    // Real-time subscriptions
    subscribeToCompanies(callback) {
        if (!this.supabase) return null;
        
        return this.supabase
            .channel('companies-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, callback)
            .subscribe();
    }

    subscribeToNovels(callback) {
        if (!this.supabase) return null;
        
        return this.supabase
            .channel('novels-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'novels' }, callback)
            .subscribe();
    }

    // Authentication
    async signUp(email, password) {
        if (!this.supabase) return { error: 'Supabase not configured' };
        
        const { data, error } = await this.supabase.auth.signUp({
            email,
            password
        });
        
        return { data, error };
    }

    async signIn(email, password) {
        if (!this.supabase) return { error: 'Supabase not configured' };
        
        const { data, error } = await this.supabase.auth.signInWithPassword({
            email,
            password
        });
        
        return { data, error };
    }

    async signOut() {
        if (!this.supabase) return { error: 'Supabase not configured' };
        
        const { error } = await this.supabase.auth.signOut();
        return { error };
    }

    async getSession() {
        if (!this.supabase) return null;
        
        const { data: { session } } = await this.supabase.auth.getSession();
        return session;
    }
}

module.exports = new SupabaseService();