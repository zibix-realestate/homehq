const neo4j = new require('@classes/neo4j')
const session_data = new require('@classes/session')
const account = new require('@classes/account')
const twig = require('twig')

class account_logout {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    await account.logout(session)
    res.redirect('/')
    return
  }
}
module.exports = new account_logout()