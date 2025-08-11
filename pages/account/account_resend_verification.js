const neo4j = new require('@classes/firestore')
const session_data = new require('@classes/session_firestore')
const account = new require('@classes/account_firestore')
const twig = require('twig')
const emailValidate = require('email-validator')
const mail = require('@classes/email')

class account_resend_verification {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let form = await session_data.get_form(session.sid,'account_resend_verification')
    let errors = {}
    let success = false
    let page_template = "account/account_resend_verification.twig"

    // If user is already logged in and unverified, pre-fill their email
    if (session.user && !session.user.validated) {
      form.email = session.user.email
    }

    if(req.body.resend_verification){
      if(req.body.email && req.body.email.length > 0){
        if(!emailValidate.validate(req.body.email)){
          errors.form = true
          errors.email = true
          errors.email_text = 'Please enter a valid email.'
        } else {
          form.email = req.body.email
          
          // Find user and resend verification email
          let user = await account.get_user_by_email(req.body.email)
          if(user && !user.validated) {
            // Generate new verification code
            let new_verify_code = await account.generate_new_verification_code(user.email)
            
            // Send verification email
            let email_object = require('@emails/account_create_thankyou.json')
            await mail.send({
              to: req.body.email,
              from: {
                email: 'admin@homehq.net',
                name: 'HomeHQ Admin Team'
              },
              subject: email_object.subject,
              text: twig.twig({data: email_object.text}).render({
                domain: process.env.DOMAIN,
                email: req.body.email,
                verify_code: new_verify_code
              }),
              html: twig.twig({data: email_object.html}).render({
                domain: process.env.DOMAIN,
                email: req.body.email,
                verify_code: new_verify_code
              })
            })
            
            success = true
            await session_data.delete_form(session.sid,'account_resend_verification')
          } else if (user && user.validated) {
            errors.form = true
            errors.email = true
            errors.email_text = 'This email is already verified.'
          } else {
            errors.form = true
            errors.email = true
            errors.email_text = 'No account found with this email address.'
          }
        }
      } else {
        errors.form = true
        errors.email = true
        errors.email_text = 'Please enter your email address.'
      }
    }

    if(!success && Object.keys(errors).length > 0) {
      await session_data.save_form(session.sid,'account_resend_verification',form)
    }

    res.render(page_template, {session, form, errors, success})
  }
}
module.exports = new account_resend_verification()