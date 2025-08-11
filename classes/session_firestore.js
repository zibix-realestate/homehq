const firestore = require('@classes/firestore')
const uuid = require('uuid')
const uuidValidate = require('uuid-validate')
const requestIp = require('request-ip')
const bcrypt = require('bcrypt')

class session {

    update = async (req, res, params = {}) => {
        let sid = await this.session_cookie(req, res)
        
        let expiry = parseInt(process.env.SESSION_COOKIE_EXPIRY)
        let payload = await this.process_payload_forstorage(params)
        let ipa = requestIp.getClientIp(req)
        let uagent = req.get('user-agent')
        
        const now = firestore.getTimestamp()
        const expiresAt = new Date(Date.now() + expiry * 1000)
        
        let sessionData = await firestore.getDoc('sessions', sid)
        
        if (sessionData) {
            const tenSecondsAgo = new Date(Date.now() - 10000)
            const lastUpdate = sessionData.updated_at?.toDate() || new Date(0)
            
            const velocity = lastUpdate > tenSecondsAgo ? (sessionData.velocity || 0) + 1 : 1
            const max_velocity = velocity > (sessionData.max_velocity || 0) && lastUpdate > tenSecondsAgo 
                ? velocity 
                : sessionData.max_velocity || 1
            
            const ip_history = sessionData.ip_history || []
            if (!ip_history.includes(ipa)) {
                ip_history.push(ipa)
            }
            
            const updateData = {
                updated_at: firestore.getServerTimestamp(),
                expires_at: expiresAt,
                velocity: velocity,
                max_velocity: max_velocity,
                ip_address: ipa,
                ip_history: ip_history,
                user_agent: uagent,
                ua_history: [uagent],
                payload: { ...(sessionData.payload || {}), ...payload }
            }
            
            await firestore.updateDoc('sessions', sid, updateData)
            sessionData = { ...sessionData, ...updateData }
        } else {
            sessionData = {
                sid: sid,
                created_at: firestore.getServerTimestamp(),
                updated_at: firestore.getServerTimestamp(),
                expires_at: expiresAt,
                velocity: 1,
                max_velocity: 1,
                ip_address: ipa,
                ip_history: [ipa],
                user_agent: uagent,
                ua_history: [uagent],
                payload: payload,
                user_id: null,
                login_time: null
            }
            
            await firestore.setDoc('sessions', sid, sessionData)
        }
        
        if (sessionData.user_id) {
            const user = await firestore.getDoc('users', sessionData.user_id)
            sessionData.user = user
            sessionData.login_cdt = sessionData.login_time
        }
        
        let session = await this.process_payload_fromdatabase(sessionData)
        
        return session
    }

    session_cookie = async (req, res) => {
        let cookie = {
            name: process.env.SESSION_COOKIE_NAME,
            domain: process.env.SESSION_COOKIE_DOMAIN,
            expiry: process.env.SESSION_COOKIE_EXPIRY,
        }
        let sid

        if (!!req.cookies[cookie.name] && uuidValidate(req.cookies[cookie.name])) {
            sid = req.cookies[cookie.name]
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
        return params
    }

    process_payload_fromdatabase = async (sessionData) => {
        let session = {
            sid: sessionData.sid,
            created_at: sessionData.created_at,
            updated_at: sessionData.updated_at,
            expires_at: sessionData.expires_at,
            velocity: sessionData.velocity,
            max_velocity: sessionData.max_velocity,
            ip_address: sessionData.ip_address,
            ip_history: sessionData.ip_history,
            user_agent: sessionData.user_agent,
            ua_history: sessionData.ua_history,
            payload: sessionData.payload || {},
            user: sessionData.user || null,
            login_cdt: sessionData.login_time || null,
            otp_code: sessionData.otp_code,
            otp_email: sessionData.otp_email,
            otp_expiry: sessionData.otp_expiry
        }
        
        Object.keys(sessionData).forEach((key) => {
            if (!session.hasOwnProperty(key)) {
                session[key] = sessionData[key]
            }
        })
        
        return session
    }

    get_form = async (sid, form) => {
        const formId = `${sid}_${form}`
        const formDoc = await firestore.getDoc('forms', formId)
        
        if (formDoc) {
            return formDoc.data || {}
        } else {
            return {}
        }
    }

    save_form = async (sid, form, form_data) => {
        const formId = `${sid}_${form}`
        const expiresAt = new Date(Date.now() + 1800 * 1000)
        
        await firestore.setDoc('forms', formId, {
            session_id: sid,
            form_name: form,
            data: form_data,
            created_at: firestore.getServerTimestamp(),
            expires_at: expiresAt
        })
        
        return true
    }

    delete_form = async (sid, form) => {
        const formId = `${sid}_${form}`
        await firestore.deleteDoc('forms', formId)
        return true
    }
}

module.exports = new session()