const neo4j = require('@classes/neo4j')
const session_data = require('@classes/session')
const account = require('@classes/account')

class account_otp_verify {
  _invoke = async (req, res) => {
    let session = await session_data.update(req, res, {})
    let form = await session_data.get_form(session.sid, 'account_otp_verify')
    let errors = {}
    let page_template = "account/account_otp_verify.twig"

    // Check if we have an email from the OTP request
    if (!form.email) {
      res.redirect('/account/otp-request')
      return
    }

    if (req.body.otp_verify) {
      if (req.body.otp && req.body.otp.length === 6) {
        // Verify OTP
        const query = `
          MATCH (s:SESSION {sid: $sid})
          WHERE s.otp_code = $otp 
            AND s.otp_email = $email
            AND s.otp_expiry > datetime()
          RETURN s
        `
        
        const result = await neo4j.run(query, {
          sid: session.sid,
          otp: req.body.otp,
          email: form.email
        })
        
        if (result.records.length > 0) {
          // OTP is valid - check if user exists
          let user = await account.get_user(form.email)
          
          if (!user) {
            // Create a new user with temporary password
            const tempPassword = require('uuid').v4()
            const bcrypt = require('bcrypt')
            const username = form.email.split('@')[0].substring(0, 20)
            
            const createForm = {
              email: form.email,
              username: username,
              password_salt: bcrypt.genSaltSync(10),
              password_encrypted: bcrypt.hashSync(tempPassword, bcrypt.genSaltSync(10)),
              validated: true, // Auto-validate OTP users
              otp_user: true
            }
            
            user = await account.create_user(createForm)
          }
          
          // Auto-login the user
          await account.auto_login(session, user)
          
          // Clean up OTP data
          const cleanupQuery = `
            MATCH (s:SESSION {sid: $sid})
            REMOVE s.otp_code, s.otp_email, s.otp_expiry
            RETURN s
          `
          await neo4j.run(cleanupQuery, { sid: session.sid })
          
          await session_data.delete_form(session.sid, 'account_otp_verify')
          
          // Redirect to profile
          res.redirect('/account/profile')
          return
        } else {
          errors.form = true
          errors.otp = true
          errors.otp_text = 'Invalid or expired code. Please request a new one.'
        }
      } else {
        errors.form = true
        errors.otp = true
        errors.otp_text = 'Please enter the 6-digit code.'
      }
    }

    res.render(page_template, { session, form, errors })
  }
}

module.exports = new account_otp_verify()