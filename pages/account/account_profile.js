const neo4j = new require('@classes/firestore')
const session_data = new require('@classes/session_firestore')
const account = new require('@classes/account_firestore')
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

    // Handle agent status toggle
    if(req.body.toggle_agent){
      const isAgent = req.body.agent_status === 'true'
      const updatedUser = await account.update_agent_status(session.user.email, isAgent)
      if(updatedUser){
        session.user = updatedUser
      }
      res.redirect('/account/profile')
      return
    }

    res.render(page_template, {session})
  }
}
module.exports = new account_profile()