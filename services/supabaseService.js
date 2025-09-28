const { createClient } = require('@supabase/supabase-js');
const { supabaseConfig } = require('../config/integrations');

class SupabaseService {
  constructor() {
    this.client = createClient(supabaseConfig.url, supabaseConfig.anonKey);
    this.adminClient = createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey);
  }

  // Company Management
  async getCompanies() {
    const { data, error } = await this.client
      .from('companies')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  }

  async createCompany(companyData) {
    const { data, error } = await this.client
      .from('companies')
      .insert([companyData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Financial Data Management
  async getFinancialData(companyId) {
    const { data, error } = await this.client
      .from('financial_data')
      .select('*')
      .eq('company_id', companyId)
      .order('upload_date', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async createFinancialData(financialData) {
    const { data, error } = await this.client
      .from('financial_data')
      .insert([financialData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Credit Memos Management
  async getCreditMemos(companyId) {
    const { data, error } = await this.client
      .from('credit_memos')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async createCreditMemo(memoData) {
    const { data, error } = await this.client
      .from('credit_memos')
      .insert([memoData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Novel Management
  async getNovels() {
    const { data, error } = await this.client
      .from('novels')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }

  async createNovel(novelData) {
    const { data, error } = await this.client
      .from('novels')
      .insert([novelData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Chapter Management
  async getChapters(novelId) {
    const { data, error } = await this.client
      .from('chapters')
      .select('*')
      .eq('novel_id', novelId)
      .order('chapter_number');
    
    if (error) throw error;
    return data;
  }

  async createChapter(chapterData) {
    const { data, error } = await this.client
      .from('chapters')
      .insert([chapterData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // Story Beats Management
  async getStoryBeats(novelId) {
    const { data, error } = await this.client
      .from('story_beats')
      .select('*')
      .eq('novel_id', novelId)
      .order('beat_number');
    
    if (error) throw error;
    return data;
  }

  async createStoryBeat(beatData) {
    const { data, error } = await this.client
      .from('story_beats')
      .insert([beatData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  // File Storage
  async uploadFile(bucket, filePath, file) {
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(filePath, file);
    
    if (error) throw error;
    return data;
  }

  async getPublicUrl(bucket, filePath) {
    const { data } = this.client.storage
      .from(bucket)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  // Database Schema Setup
  async setupDatabase() {
    // This would typically be done through Supabase dashboard or migrations
    // For now, we'll just verify the connection
    const { data, error } = await this.client
      .from('companies')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection error:', error);
      return false;
    }
    
    console.log('Supabase connected successfully');
    return true;
  }
}

module.exports = new SupabaseService();