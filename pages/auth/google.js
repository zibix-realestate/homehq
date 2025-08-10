const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const account = require('@classes/account')
const session_data = require('@classes/session')
const { v4: uuid } = require('uuid')

// Configure Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'YOUR_GOOGLE_CLIENT_SECRET',
    callbackURL: "/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, done) {
    try {
      // Check if user exists
      let user = await account.get_user(profile.emails[0].value)
      
      if (!user) {
        // Create new user
        const form = {
          email: profile.emails[0].value,
          username: profile.displayName.toLowerCase().replace(/\s+/g, '_').substring(0, 20),
          password_salt: 'oauth',
          password_encrypted: 'oauth_' + uuid(),
          validated: true, // Auto-validate OAuth users
          oauth_provider: 'google',
          oauth_id: profile.id
        }
        
        user = await account.create_user(form)
      }
      
      return done(null, user)
    } catch (error) {
      return done(error, null)
    }
  }
))

class google_auth {
  authenticate = passport.authenticate('google', { scope: ['profile', 'email'] })
  
  callback = [
    passport.authenticate('google', { 
      failureRedirect: '/account/login',
      session: false  // Disable Passport's session handling
    }),
    async (req, res) => {
      // Auto-login the user using our custom session system
      let session = await session_data.update(req, res, {})
      await account.auto_login(session, req.user)
      res.redirect('/account/profile')
    }
  ]
}

module.exports = new google_auth()