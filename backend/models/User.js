const { supabase } = require('../config/db');
const bcrypt = require('bcryptjs');

class User {
  // Create a new user
  static async create(userData) {
    try {
      // Hash password only if provided (OAuth users don't have passwords)
      let hashedPassword = null;
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(userData.password, salt);
      }
      
      // Prepare user data
      const insertData = {
        name: userData.name,
        email: userData.email,
        password_hash: hashedPassword,
        role: userData.role,
        department: userData.department,
        start_date: userData.start_date || null,
        email_verified: userData.email_verified || false,
        verification_token: userData.verification_token || null,
        verification_token_expires: userData.verification_token_expires || null
      };

      // Add google_id if provided
      if (userData.google_id) {
        insertData.google_id = userData.google_id;
      }
      
      // Insert user into database
      const { data, error } = await supabase
        .from('users')
        .insert([insertData])
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Remove password hash from response
      if (data && data.length > 0) {
        delete data[0].password_hash;
      }
      
      return data[0];
    } catch (error) {
      console.error('User creation error:', error);
      throw error;
    }
  }
  
  // Find user by email
  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Supabase error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Find user by email error:', error);
      throw error;
    }
  }
  
  // Find user by ID
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Remove password hash from response
      if (data) {
        delete data.password_hash;
      }
      
      return data;
    } catch (error) {
      console.error('Find user by ID error:', error);
      throw error;
    }
  }
  
  // Get all users
  static async getAll() {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, department, start_date, created_at');
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Get all users error:', error);
      throw error;
    }
  }
  
  // Update user
  static async update(id, userData) {
    try {
      // Create clean update object
      const updateData = { ...userData };
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.created_at;
      delete updateData.password_hash;
      
      // If password is being updated, hash it
      if (updateData.password && updateData.password.trim() !== '') {
        const salt = await bcrypt.genSalt(10);
        updateData.password_hash = await bcrypt.hash(updateData.password, salt);
      }
      
      // Always remove password field (we use password_hash)
      delete updateData.password;
      
      // Remove undefined, null, or empty string values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === null || updateData[key] === '') {
          delete updateData[key];
        }
      });
      
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      // Remove password hash from response
      if (data && data.length > 0) {
        delete data[0].password_hash;
      }
      
      return data[0];
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }
  
  // Delete user
  static async delete(id) {
    try {
      const { data, error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }
  
  // Verify password
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      console.error('Password verification error:', error);
      throw error;
    }
  }
}

module.exports = User;