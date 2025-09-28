const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize SQLite database
const db = new sqlite3.Database('workspace.db');

async function migrateData() {
    console.log('Starting migration from SQLite to Supabase...');
    
    try {
        // Migrate companies
        console.log('Migrating companies...');
        const companies = await getSQLiteData('SELECT * FROM companies');
        for (const company of companies) {
            const { error } = await supabase
                .from('companies')
                .insert([{
                    id: company.id,
                    name: company.name,
                    industry: company.industry,
                    created_at: company.created_at
                }]);
            
            if (error) {
                console.error('Error migrating company:', error);
            } else {
                console.log(`Migrated company: ${company.name}`);
            }
        }

        // Migrate financial data
        console.log('Migrating financial data...');
        const financialData = await getSQLiteData('SELECT * FROM financial_data');
        for (const data of financialData) {
            const { error } = await supabase
                .from('financial_data')
                .insert([{
                    id: data.id,
                    company_id: data.company_id,
                    document_type: data.document_type,
                    file_path: data.file_path,
                    extracted_data: data.extracted_data,
                    upload_date: data.upload_date
                }]);
            
            if (error) {
                console.error('Error migrating financial data:', error);
            } else {
                console.log(`Migrated financial data: ${data.id}`);
            }
        }

        // Migrate credit memos
        console.log('Migrating credit memos...');
        const creditMemos = await getSQLiteData('SELECT * FROM credit_memos');
        for (const memo of creditMemos) {
            const { error } = await supabase
                .from('credit_memos')
                .insert([{
                    id: memo.id,
                    company_id: memo.company_id,
                    memo_type: memo.memo_type,
                    title: memo.title,
                    content: memo.content,
                    financial_metrics: memo.financial_metrics ? JSON.parse(memo.financial_metrics) : null,
                    created_at: memo.created_at
                }]);
            
            if (error) {
                console.error('Error migrating credit memo:', error);
            } else {
                console.log(`Migrated credit memo: ${memo.title}`);
            }
        }

        // Migrate novels
        console.log('Migrating novels...');
        const novels = await getSQLiteData('SELECT * FROM novels');
        for (const novel of novels) {
            const { error } = await supabase
                .from('novels')
                .insert([{
                    id: novel.id,
                    title: novel.title,
                    description: novel.description,
                    pov_style: novel.pov_style,
                    tense: novel.tense,
                    target_chapters: novel.target_chapters,
                    target_beats: novel.target_beats,
                    created_at: novel.created_at
                }]);
            
            if (error) {
                console.error('Error migrating novel:', error);
            } else {
                console.log(`Migrated novel: ${novel.title}`);
            }
        }

        // Migrate chapters
        console.log('Migrating chapters...');
        const chapters = await getSQLiteData('SELECT * FROM chapters');
        for (const chapter of chapters) {
            const { error } = await supabase
                .from('chapters')
                .insert([{
                    id: chapter.id,
                    novel_id: chapter.novel_id,
                    chapter_number: chapter.chapter_number,
                    title: chapter.title,
                    pov_character: chapter.pov_character,
                    summary: chapter.summary,
                    word_count: chapter.word_count,
                    created_at: chapter.created_at
                }]);
            
            if (error) {
                console.error('Error migrating chapter:', error);
            } else {
                console.log(`Migrated chapter: ${chapter.title}`);
            }
        }

        // Migrate story beats
        console.log('Migrating story beats...');
        const storyBeats = await getSQLiteData('SELECT * FROM story_beats');
        for (const beat of storyBeats) {
            const { error } = await supabase
                .from('story_beats')
                .insert([{
                    id: beat.id,
                    novel_id: beat.novel_id,
                    chapter_id: beat.chapter_id,
                    beat_number: beat.beat_number,
                    description: beat.description,
                    beat_type: beat.beat_type,
                    pov_character: beat.pov_character,
                    created_at: beat.created_at
                }]);
            
            if (error) {
                console.error('Error migrating story beat:', error);
            } else {
                console.log(`Migrated story beat: ${beat.beat_number}`);
            }
        }

        console.log('Migration completed successfully!');
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        db.close();
    }
}

function getSQLiteData(query) {
    return new Promise((resolve, reject) => {
        db.all(query, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Run migration if this file is executed directly
if (require.main === module) {
    migrateData();
}

module.exports = { migrateData };