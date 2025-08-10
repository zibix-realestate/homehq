const neo4j = new require('@classes/neo4j')
const session_data = new require('@classes/session')
const account = new require('@classes/account')
const twig = require('twig')
const bcrypt = require('bcrypt')
const emailValidate = require('email-validator')
const mail = require('@classes/email')

class account_login {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let form = {}
    let errors = {}
    let placeholders = {
      email: "enter email",
      password: "enter password"
    }
    let page_template = "account/account_login.twig"
    let user = {}

    if(req.body.account_login){

        if(req.body.email.length > 0){
            if(!emailValidate.validate(req.body.email)){
                errors.account_create = true
                errors.email = true
                errors.email_text = 'Please enter a valid email.'
            } else {
                form.email = req.body.email
            }
        } else {
            errors.account_create = true
            errors.email = true
            errors.email_text = 'Please enter a valid email.'
        }

        if(!req.body.password.match(`^.{8,256}$`)){
            errors.form = true
            errors.password = true
            errors.password_text = 'Passwords are 8-256 Characters.'

        }else{
            form.password = req.body.password
        }
    }

    if(Object.keys(errors).length === 0 && form.email && form.password){
      user = await account.login(session,form.email,form.password)
      if(user){
        res.redirect('/')
        return
      }
    }

    res.render(page_template, {session,placeholders,errors})
  }
}
module.exports = new account_login()