const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      console.log('🔐 Google OAuth callback received');
      console.log('📧 Email:', profile.emails[0].value);
      console.log('👤 Name:', profile.displayName);
      
      const email = profile.emails[0].value;
      const name = profile.displayName;
      const googleId = profile.id;
      
      // Check if user already exists
      let user = await User.findByEmail(email);
      
      if (user) {
        console.log('✅ Existing user found:', user.id);
        
        // Update google_id if not set
        if (!user.google_id) {
          await User.update(user.id, { google_id: googleId });
          console.log('🔗 Linked Google account to existing user');
        }
        
        return done(null, user);
      }
      
      // No account exists - reject login
      console.log('❌ No account found for Google login:', email);
      return done(new Error('No account found. Please sign up first using email and password.'), null);
      
    } catch (error) {
      console.error('❌ Google OAuth error:', error);
      return done(error, null);
    }
  }
));

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
