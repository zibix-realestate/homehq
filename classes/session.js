const neo4j = new require('@classes/neo4j')
const uuid = require('uuid')
const uuidValidate = require('uuid-validate')
const requestIp = require('request-ip')
const bcrypt = require('bcrypt')


class session {

    update = async (req,res,params = {}) => {

        let sid = await this.session_cookie(req,res)
        
        let expiry = process.env.SESSION_COOKIE_EXPIRY
        let payload = await this.process_payload_forstorage(params)
        let ipa = requestIp.getClientIp(req)
        let data = await neo4j.query(`
        MERGE (s:SESSION {sid:$sid})
        ON CREATE SET
            s.cdt = datetime(),
            s.udt = datetime(),
            s.velocity = 1,
            s.max_velocity = 1,
            s.ipa = $ipa,
            s.iparray = [$ipa],
            s.uagent = $uagent,
            s.uarray = [$uagent],
            s += $payload
        ON MATCH SET
            s.velocity = CASE WHEN s.udt > datetime()-duration({seconds:10}) THEN s.velocity + 1 ELSE 1 END,
            s.max_velocity = CASE WHEN (s.velocity+1) > s.max_velocity AND s.udt > datetime()-duration({seconds:10}) THEN (s.velocity + 1) ELSE s.max_velocity END,
            s.udt = datetime(),
            s.ipa = $ipa,
            s.iparray = CASE WHEN $ipa IN s.iparray THEN s.iparray ELSE s.iparray + $ipa END,
            s.uagent = $uagent,
            s.uarray = [$uagent],
            //s.uarray = CASE WHEN $uagent IN s.uarray THEN s.uarray ELSE s.uarray + $uagent END,
            s += $payload
        WITH s
        CALL apoc.ttl.expireIn(s,toInteger($expiry),'s')
        WITH s
        OPTIONAL MATCH (s)-[l:LOGGED]->(u:USER)
        RETURN s {.*, login_cdt: l.cdt, user: u {.*}} as session
        `,{
            sid: sid,
            expiry:expiry,
            payload: payload,
            ipa: ipa,
            uagent: req.get('user-agent'),
        })
        
        let session = await this.process_payload_fromdatabase(data[0].session)

        return session

    }

    session_cookie = async (req,res) => {

        let cookie = {
            name: process.env.SESSION_COOKIE_NAME,
            domain: process.env.SESSION_COOKIE_DOMAIN,
            expiry: process.env.SESSION_COOKIE_EXPIRY,
        }
        let sid

        if(!!req.cookies[cookie.name] && uuidValidate(req.cookies[cookie.name])){
            sid =  req.cookies[cookie.name]
        } else {
            sid = uuid.v4()
        }

        res.cookie(cookie.name, sid, {
            path: '/',
            domain: cookie.domain,
            maxAge: cookie.expiry * 1000,
            sameSite: 'lax'
        })
    
        return sid
    }

    process_payload_forstorage = async (params) => {

        let new_params = {}
        Object.keys(params).forEach((key) => {
            if((Array.isArray(params[key]) || typeof params[key] == "object") && params[key] !== null){
                new_params['pj.'+key] = JSON.stringify(params[key])
                new_params['pv.'+key] = null // if the property changes from value to json, null to opposite value
            }else{
                new_params['pv.'+key] = params[key]
                new_params['pj.'+key] = null // if the property changes from json to value, null to opposite json
            }
        })

        return new_params
    }

    process_payload_fromdatabase = async (params) => {

        let session = {payload:{}}
        Object.keys(params).forEach((key) => {
            if(key.substring(0, 3) == 'pj.') {
                let new_key = key.substring(3)
                session.payload[new_key] = JSON.parse(params[key])
            } else if (key.substring(0, 3) == 'pv.') {
                let new_key = key.substring(3)
                session.payload[new_key] = params[key]
            } else {
                session[key] = params[key]
            }
        })
        return session
    }

    get_form = async (sid,form) => {
        let data = await neo4j.query(`
        MATCH (fm:FORM {sid:$sid,form:$form})
        RETURN fm {.*} AS form
        `,{
            sid: sid,
            form: form
        })
        if(!!data[0]){
            return JSON.parse(data[0].form.data)
        }else{
            return {}
        }
    }

    save_form = async (sid,form,form_data) => {
        let data = await neo4j.query(`
        MERGE (fm:FORM {sid:$sid,form:$form})
            SET fm.data = $form_data
        WITH fm
        CALL apoc.ttl.expireIn(fm,1800,'s')
        RETURN fm AS form
        `,{
            sid: sid,
            form: form,
            form_data: JSON.stringify(form_data)
        })
    }

    delete_form = async (sid,form) => {
        let data = await neo4j.query(`
        MATCH (fm:FORM {sid:$sid,form:$form})
            DELETE fm
        `,{
            sid: sid,
            form: form
        })
    }
}

module.exports = new session()



