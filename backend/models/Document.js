const { supabase } = require('../config/db');

class Document {
  // Create document record
  static async create(documentData) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .insert([documentData])
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Get document by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          uploader:uploaded_by (id, name, email),
          user:user_id (id, name, email)
        `)
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get documents by user ID
  static async findByUserId(userId, limit = 100, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          uploader:uploaded_by (id, name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get all documents (for admin)
  static async getAll(filters = {}, limit = 100, offset = 0) {
    try {
      let query = supabase
        .from('documents')
        .select(`
          *,
          uploader:uploaded_by (id, name, email),
          user:user_id (id, name, email)
        `);
      
      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Update document
  static async update(id, documentData) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .update(documentData)
        .eq('id', id)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  // Delete document
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return data;
    } catch (error) {
      throw error;
    }
  }
  
  // Get document statistics
  static async getStats(userId = null) {
    try {
      let query = supabase
        .from('documents')
        .select('type, size');
      
      if (userId) {
        query = query.eq('user_id', userId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Calculate statistics
      const totalDocuments = data.length;
      const totalSize = data.reduce((sum, doc) => sum + (doc.size || 0), 0);
      
      // Count by type
      const typeCount = data.reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
      }, {});
      
      return {
        totalDocuments,
        totalSize,
        typeCount
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Document;
