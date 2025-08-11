const neo4j = new require('@classes/firestore')
const session_data = new require('@classes/session_firestore')
const account = new require('@classes/account_firestore')
const twig = require('twig')

class account_verify {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let page_template = "account/account_verify.twig"
    console.log(req.query.vcode)
    let user = false;
    if(req.query.vcode){
        user = await account.verify(req.query.vcode)
        if(user){
            await account.auto_login(session,user)
            session = await session_data.update(req,res,{})
        }
    }
    
    res.render(page_template, {session,user})
  }
}
module.exports = new account_verify()