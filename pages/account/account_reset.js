const neo4j = new require('@classes/firestore')
const session_data = new require('@classes/session_firestore')
const account = new require('@classes/account_firestore')
const twig = require('twig')
const bcrypt = require('bcrypt')

class account_reset {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let page_template = "account/account_reset.twig"
    let user = false;
    let form = {}
    let errors = {}
    let placeholders = {
      password: "enter new password"
    }
    if(req.query.rcode){
        user = await account.reset_lookup(req.query.rcode)
        if(user){
            form.rcode = req.query.rcode
        } else {
            errors.form = true
            errors.rcode = true
            errors.rcode_text = 'Invalid Link. <a href="/account/reset-request">Request a new reset link</a>'
        }
    } else {
        form = await session_data.get_form(session.sid,'account_reset')
    }

    if(req.body.account_reset){
        if(!req.body.password.match(`^.{8,256}$`)){
            errors.form = true
            errors.password = true
            errors.password_text = 'Passwords are 8-256 Characters.'
            delete form.password_encrypted
            delete form.password_salt
        }else{
            form.password_salt = bcrypt.genSaltSync(10)
            form.password_encrypted = bcrypt.hashSync(req.body.password, form.password_salt)
        }
    }

    if(Object.keys(errors).length === 0 && form.rcode && form.password_salt && form.password_encrypted){
        await account.reset_password(session,form)
        session = await session_data.update(req,res,{})
        await session_data.delete_form(session.sid,'account_reset')
    } else {
        await session_data.save_form(session.sid,'account_reset',form)
    }
    console.log(form)

    res.render(page_template, {session,form,errors,placeholders})
  }
}
module.exports = new account_reset()