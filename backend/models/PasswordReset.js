const { supabase } = require('../config/db');

class PasswordReset {
  /**
   * Create a password reset token
   */
  static async create(email, code) {
    try {
      console.log('💾 Creating password reset token for:', email);
      
      // Delete any existing tokens for this email
      await this.deleteByEmail(email);
      
      // Create new token with 10 minute expiry
      // Use UTC time to avoid timezone issues
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // Add 10 minutes in milliseconds
      
      console.log('💾 Token expiry details:', {
        now: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        minutesFromNow: 10
      });
      
      console.log('💾 Inserting into password_resets table...');
      const { data, error } = await supabase
        .from('password_resets')
        .insert([{
          email,
          code,
          expires_at: expiresAt.toISOString(),
          used: false
        }])
        .select();
      
      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log('✅ Password reset token created:', data[0]?.id);
      return data[0];
    } catch (error) {
      console.error('❌ PasswordReset.create error:', error);
      throw error;
    }
  }
  
  /**
   * Verify reset code
   */
  static async verify(email, code) {
    try {
      console.log('🔍 PasswordReset.verify - Looking for:', { email, code });
      
      const { data, error } = await supabase
        .from('password_resets')
        .select('*')
        .eq('email', email)
        .eq('code', code)
        .eq('used', false)
        .single();
      
      if (error) {
        console.log('❌ Database query error:', error);
        if (error.code === 'PGRST116') {
          // No rows returned
          console.log('❌ No matching reset token found');
          return null;
        }
        throw error;
      }
      
      console.log('✅ Reset token found:', data);
      
      // Check if token is expired
      // Parse the expires_at string directly to avoid timezone conversion issues
      const now = new Date();
      
      // The database returns timestamp without timezone info
      // We need to treat it as UTC
      const expiresAtStr = data.expires_at;
      
      // If the string doesn't end with 'Z', add it to indicate UTC
      const expiresAtUTC = expiresAtStr.endsWith('Z') ? expiresAtStr : expiresAtStr + 'Z';
      const expiresAt = new Date(expiresAtUTC);
      
      // Get timestamps in milliseconds for accurate comparison
      const nowTime = now.getTime();
      const expiresTime = expiresAt.getTime();
      const isExpired = nowTime > expiresTime;
      
      console.log('⏰ Checking expiry:', {
        now: now.toISOString(),
        nowTime,
        expiresAtOriginal: expiresAtStr,
        expiresAtUTC: expiresAtUTC,
        expiresAt: expiresAt.toISOString(),
        expiresTime,
        expired: isExpired,
        minutesRemaining: Math.floor((expiresTime - nowTime) / 1000 / 60)
      });
      
      if (isExpired) {
        console.log('❌ Token expired');
        return null; // Token expired
      }
      
      console.log('✅ Token is valid and not expired');
      return data;
    } catch (error) {
      console.error('❌ PasswordReset.verify error:', error);
      throw error;
    }
  }
  
  /**
   * Mark token as used
   */
  static async markAsUsed(email, code) {
    try {
      const { data, error } = await supabase
        .from('password_resets')
        .update({ used: true })
        .eq('email', email)
        .eq('code', code)
        .select();
      
      if (error) throw error;
      return data[0];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Delete reset tokens by email
   */
  static async deleteByEmail(email) {
    try {
      const { error } = await supabase
        .from('password_resets')
        .delete()
        .eq('email', email);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Clean up expired tokens (run periodically)
   */
  static async cleanupExpired() {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('password_resets')
        .delete()
        .lt('expires_at', now);
      
      if (error) throw error;
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = PasswordReset;
