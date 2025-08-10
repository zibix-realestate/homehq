const neo4j = new require('@classes/neo4j')
const uuid = require('uuid')
const uuidValidate = require('uuid-validate')
const requestIp = require('request-ip')
const bcrypt = require('bcrypt')


class account {

    check_existing_email = async (email) => {

        let data = await neo4j.query(`
        MATCH (user:USER {email:$email})
        RETURN true AS duplicate
        `,{
            email: email
        })
        if(!!data[0]){
            return true
        }else{
            return false
        }

    }

    create_user = async (form) => {
        let data = await neo4j.query(`
        CREATE (user:USER {email:$email})
            SET 
                user.password_salt = $password_salt,
                user.password_encrypted = $password_encrypted,
                user.cdt = datetime(),
                user.validate_code = $validate_code,
                user.validated = false,
                user.login_code = $login_code,
                user.username = $username,
                user.flagged = false
        WITH user
        CALL {
            OPTIONAL MATCH (un:USER {username:$username})
            WITH un ORDER BY un.username_ext DESC LIMIT 1
            RETURN CASE WHEN un.username_ext IS NULL THEN 1 ELSE toInteger(un.username_ext + 1) END as username_ext
        }
        WITH user, username_ext
        SET user.username_ext = username_ext
        
        RETURN user {.*}
        `,{
            email: form.email,
            password_salt: form.password_salt,
            password_encrypted: form.password_encrypted,
            validate_code: uuid.v4(),
            login_code: uuid.v4(),
            username: form.username
        })
        if(!!data[0]){
            return data[0].user
        }else{
            return false
        }
    }
    
    verify = async (vcode) => {
        let data = await neo4j.query(`
        MATCH (user:USER {validate_code:$vcode})
            SET 
                user.validated = true,
                user.validate_code = null
        RETURN user {.*}
        `,{
            vcode: vcode
        })
        if(!!data[0]){
            return data[0].user
        }else{
            return false
        }
    }

    auto_login = async (session,user) => {
        let expiry = process.env.SESSION_COOKIE_LOGGED_EXPIRY
        let data = await neo4j.query(`
        MATCH 
            (user:USER {email:$user.email}),
            (session:SESSION {sid:$session.sid})
    
        MERGE (session)-[logged:LOGGED]->(user)
            SET logged.cdt = datetime(), logged.date = date()
        WITH user,session
        CALL apoc.ttl.expireIn(session,toInteger($expiry),'s')
        RETURN true as logged
        `,{
            user:user,
            session:session,
            expiry:expiry
        })
        if(!!data[0]){
            return data[0].logged
        }else{
            return false
        }
    }

    get_user = async (email) => {

        let data = await neo4j.query(`
        MATCH (user:USER {email:$email})
        RETURN user {.*}
        `,{
            email: email
        })
        if(!!data[0]){
            return data[0].user
        }else{
            return false
        }
    }

    login = async (session,email,password) => {
        let user = await this.get_user(email)
        if(user && user.password_encrypted == bcrypt.hashSync(password, user.password_salt)){
            
            let expiry = process.env.SESSION_COOKIE_LOGGED_EXPIRY
            let data = await neo4j.query(`
            MATCH 
                (user:USER {email:$user.email}),
                (session:SESSION {sid:$session.sid})
        
            MERGE (session)-[logged:LOGGED]->(user)
                SET logged.cdt = datetime(), logged.date = date()
            WITH user,session
            CALL apoc.ttl.expireIn(session,toInteger($expiry),'s')
            RETURN true as logged
            `,{
                user:user,
                session:session,
                expiry:expiry
            })
            if(!!data[0]){
                return data[0].logged
            }


        }
        
        return false
    }

    logout = async (session) => {
        let expiry = process.env.SESSION_COOKIE_EXPIRY
        let data = await neo4j.query(`
        MATCH (session:SESSION {sid:$session.sid})
        WITH session
        MATCH (session)-[logged:LOGGED]->(:USER)
            DELETE logged
        WITH session
        CALL apoc.ttl.expireIn(session,toInteger($expiry),'s')
        `,{
            session:session,
            expiry:expiry
        })
        return true
    }

    reset_request = async (email) => {

        let data = await neo4j.query(`
        MATCH (user:USER {email:$email})
            SET 
                user.reset_code = $reset_code
        RETURN user {.*}
        `,{
            email: email,
            reset_code: uuid.v4()
        })
        if(!!data[0]){
            return data[0].user
        }else{
            return false
        }
    }

    reset_lookup = async (rcode) => {

        let data = await neo4j.query(`
        MATCH (user:USER {reset_code:$reset_code})
        RETURN user {.*}
        `,{
            reset_code: rcode
        })
        if(!!data[0]){
            return data[0].user
        }else{
            return false
        }
    }

    reset_password = async (session,form) => {

        let data = await neo4j.query(`
        MATCH (user:USER {reset_code:$reset_code})
            SET
                user.reset_code = null,
                user.password_salt = $password_salt,
                user.password_encrypted = $password_encrypted
        WITH user
        MATCH (session:SESSION {sid:$sid})
        WITH user, session
        OPTIONAL MATCH (session)-[logged:LOGGED]->()
        DELETE logged
        WITH user, session
        MERGE (session)-[logged:LOGGED]->(user)
            SET logged.cdt = datetime()
        RETURN user {.*}
        `,{
            reset_code: form.rcode,
            sid: session.sid,
            password_salt: form.password_salt,
            password_encrypted: form.password_encrypted
        })
        if(!!data[0]){
            return data[0].user
        }else{
            return false
        }
    }

    get_user_by_email = async (email) => {
        return await this.get_user(email)
    }

    generate_new_verification_code = async (email) => {
        let new_code = uuid.v4()
        let data = await neo4j.query(`
        MATCH (user:USER {email:$email})
            SET user.validate_code = $validate_code
        RETURN user.validate_code as verify_code
        `,{
            email: email,
            validate_code: new_code
        })
        if(!!data[0]){
            return data[0].verify_code
        }else{
            return false
        }
    }





}

module.exports = new account()