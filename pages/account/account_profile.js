const neo4j = new require('@classes/neo4j')
const session_data = new require('@classes/session')
const account = new require('@classes/account')
const twig = require('twig')

class account_profile {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let page_template = "account/account_profile.twig"

    // Check if user is logged in
    if(!session.user){
      res.redirect('/account/login')
      return
    }

    res.render(page_template, {session})
  }
}
module.exports = new account_profile()