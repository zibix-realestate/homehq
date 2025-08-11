const firestore = require('@classes/firestore')
const session_data = require('@classes/session_firestore')
const account = require('@classes/account_firestore')
const mail = require('@classes/email')
const emailValidate = require('email-validator')
const { v4: uuid } = require('uuid')

class account_otp_request {
  _invoke = async (req, res) => {
    let session = await session_data.update(req, res, {})
    let form = await session_data.get_form(session.sid, 'account_otp_request')
    let errors = {}
    let success = false
    let page_template = "account/account_otp_request.twig"

    if (req.body.otp_request) {
      if (req.body.email && req.body.email.length > 0) {
        if (!emailValidate.validate(req.body.email)) {
          errors.form = true
          errors.email = true
          errors.email_text = 'Please enter a valid email.'
        } else {
          form.email = req.body.email
          
          // Generate OTP (6-digit code)
          const otp = Math.floor(100000 + Math.random() * 900000).toString()
          
          // Store OTP in session with expiry (5 minutes)
          const otpExpiry = new Date(Date.now() + 5 * 60 * 1000)
          
          await firestore.updateDoc('sessions', session.sid, {
            otp_code: otp,
            otp_email: req.body.email,
            otp_expiry: otpExpiry
          })
          
          // Send OTP email
          await mail.send({
            to: req.body.email,
            from: {
              email: 'admin@homehq.net',
              name: 'HomeHQ Security'
            },
            subject: 'Your HomeHQ One-Time Password',
            text: `Your one-time password is: ${otp}\n\nThis code will expire in 5 minutes.`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
                <h2>Your One-Time Password</h2>
                <p>Use this code to sign in to HomeHQ:</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otp}</span>
                </div>
                <p style="color: #6b7280;">This code will expire in 5 minutes.</p>
              </div>
            `
          })
          
          success = true
          await session_data.save_form(session.sid, 'account_otp_verify', { email: req.body.email })
          await session_data.delete_form(session.sid, 'account_otp_request')
          
          // Redirect to OTP verification page
          res.redirect('/account/otp-verify')
          return
        }
      } else {
        errors.form = true
        errors.email = true
        errors.email_text = 'Please enter your email address.'
      }
    }

    if (!success && Object.keys(errors).length > 0) {
      await session_data.save_form(session.sid, 'account_otp_request', form)
    }

    res.render(page_template, { session, form, errors })
  }
}

module.exports = new account_otp_request()