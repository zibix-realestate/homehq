const neo4j = new require('@classes/firestore')
const session_data = new require('@classes/session_firestore')
const account = new require('@classes/account_firestore')
const twig = require('twig')
const bcrypt = require('bcrypt')
const emailValidate = require('email-validator')
const mail = require('@classes/email')

class account_create {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let form = await session_data.get_form(session.sid,'account_create')
    let errors = {}
    let placeholders = {
      email: "enter email",
      password: "enter password",
      username: "enter username"
    }
    let page_template = "account/account_create.twig"
    let user = {}

    if(req.body.account_create){

      if(req.body.email.length > 0){
        if(!emailValidate.validate(req.body.email)){
          errors.form = true
          errors.email = true
          errors.email_text = 'Please enter a valid email.'
        } else {
          let duplicate = await account.check_existing_email(req.body.email)
          if(duplicate){
            errors.form = true
            errors.email = true
            errors.email_text = 'That email is in use.'
          } else {
            form.email = req.body.email
          }
        }
      } else {
        errors.form = true
        errors.email = true
        errors.email_text = 'Please enter a valid email.'
      }

      if(req.body.password.length > 0){
        if(!req.body.password.match(`^.{8,256}$`)){
          errors.form = true
          errors.password = true
          errors.password_text = 'Passwords are 8-256 Characters.'
          delete form.password_encrypted
          delete form.password_salt
        }else{
          form.password_salt = bcrypt.genSaltSync(10)
          form.password_encrypted = bcrypt.hashSync(req.body.password, form.password_salt)
          placeholders.password = "●●●●●●"
          form.password = ''
        }
      } else if (!form.password_encrypted || form.password_encrypted.length == undefined) {
        errors.form = true
        errors.password = true
        errors.password_text = 'Please Enter a password 8-256 Characters in length.'
      }
    

      if(req.body.username && req.body.username.length > 0){
        if(!req.body.username.match(`^[a-zA-Z0-9-_]{4,20}$`)){
          errors.form = true
          errors.username = true
          errors.username_text = 'Please username (letters, numbers 4-20 chars).'
        } else {
          form.username = req.body.username
        }
      } else {
        errors.form = true
        errors.username = true
        errors.username_text = 'Please username (letters, numbers 4-20 chars).'
      }
    }
    
    if(form.password_encrypted){
      placeholders.password = "●●●●●●"
    }

    if(Object.keys(errors).length === 0 && form.email && form.password_salt && form.password_encrypted && form.username){
      user = await account.create_user(form)

      let email_object = require('@emails/account_create_thankyou.json')
      await mail.send({
        to: form.email,
        from: {
          email: 'admin@homehq.net',
          name: 'HomeHQ Admin Team'
        },
        subject: email_object.subject,
        text: twig.twig({data: email_object.text}).render({
          domain: process.env.DOMAIN,
          email: form.email,
          verify_code: user.validate_code
        }),
        html: twig.twig({data: email_object.html}).render({
          domain: process.env.DOMAIN,
          email: user.email,
          verify_code: user.validate_code
        })
      })

      await session_data.delete_form(session.sid,'account_create')
      page_template = "account/account_create_thankyou.twig"
    }else{
      await session_data.save_form(session.sid,'account_create',form)
    }
    
    res.render(page_template, {session,form,placeholders,errors,user})
  }
}
module.exports = new account_create()