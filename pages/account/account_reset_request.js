const neo4j = new require('@classes/firestore')
const session_data = new require('@classes/session_firestore')
const account = new require('@classes/account_firestore')
const twig = require('twig')
const bcrypt = require('bcrypt')
const emailValidate = require('email-validator')
const mail = require('@classes/email')

class account_reset_request {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let form = {}
    let errors = {}
    let placeholders = {
      email: "enter email"
    }
    let page_template = "account/account_reset_request.twig"
    let user = {}

    if(req.body.account_reset){
        if(req.body.email.length > 0){
            if(!emailValidate.validate(req.body.email)){
                errors.account_reset = true
                errors.email = true
                errors.email_text = 'Please enter a valid email.'
            } else {
                form.email = req.body.email
            }
        } else {
            errors.account_reset = true
            errors.email = true
            errors.email_text = 'Please enter a valid email.'
        }
    }

    if(Object.keys(errors).length === 0 && form.email){
        user = await account.reset_request(form.email)
        if(user){
        console.log('reset_request',user)
        let email_object = require('@emails/account_reset_request.json')
        console.log('email',email_object)
        await mail.send({
            to: user.email,
            from: {
                email: 'admin@homehq.net',
                name: 'HomeHQ Admin Team'
            },
            subject: email_object.subject,
            text: twig.twig({data: email_object.text}).render({
            domain: process.env.DOMAIN,
            email: form.email,
            reset_code: user.reset_code
            }),
            html: twig.twig({data: email_object.html}).render({
            domain: process.env.DOMAIN,
            email: user.email,
            reset_code: user.reset_code
            })
        })

      } else {
        errors.account_reset = true
        errors.email = true
        errors.email_text = 'Invalid Email.'
      }
    }

    res.render(page_template, {session,placeholders,errors,user})
  }
}
module.exports = new account_reset_request()