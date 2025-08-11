const neo4j = new require('@classes/firestore')
const session_data = new require('@classes/session_firestore')
const twig = require('twig')

class home {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    console.log(session)
    res.render("home.twig", {session})
  }
}
module.exports = new home()