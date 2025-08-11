const firestore = require('@classes/firestore')
const uuid = require('uuid')
const uuidValidate = require('uuid-validate')
const requestIp = require('request-ip')
const bcrypt = require('bcrypt')

class account {

    check_existing_email = async (email) => {
        const user = await firestore.getDoc('users', email)
        return !!user
    }

    create_user = async (form) => {
        const email = form.email
        const username = form.username
        
        const usernameExt = await this.get_next_username_extension(username)
        
        const userData = {
            email: email,
            username: username,
            username_ext: usernameExt,
            password_salt: form.password_salt,
            password_encrypted: form.password_encrypted,
            created_at: firestore.getServerTimestamp(),
            validate_code: uuid.v4(),
            login_code: uuid.v4(),
            validated: form.validated || false,
            flagged: false,
            status: [],
            otp_user: form.otp_user || false
        }
        
        try {
            await firestore.setDoc('users', email, userData)
            return userData
        } catch (error) {
            console.error('Error creating user:', error)
            return false
        }
    }
    
    get_next_username_extension = async (username) => {
        const registryDoc = await firestore.getDoc('username_registry', username)
        
        if (!registryDoc) {
            await firestore.setDoc('username_registry', username, {
                base_username: username,
                last_extension: 1,
                users: []
            })
            return 1
        }
        
        const nextExtension = (registryDoc.last_extension || 0) + 1
        await firestore.updateDoc('username_registry', username, {
            last_extension: nextExtension
        })
        
        return nextExtension
    }
    
    verify = async (vcode) => {
        const users = await firestore.query('users', [
            { field: 'validate_code', operator: '==', value: vcode }
        ])
        
        if (users.length > 0) {
            const user = users[0]
            await firestore.updateDoc('users', user.email, {
                validated: true,
                validate_code: null
            })
            return { ...user, validated: true, validate_code: null }
        }
        
        return false
    }

    auto_login = async (session, user) => {
        const expiry = parseInt(process.env.SESSION_COOKIE_LOGGED_EXPIRY)
        const expiresAt = new Date(Date.now() + expiry * 1000)
        
        try {
            await firestore.updateDoc('sessions', session.sid, {
                user_id: user.email,
                login_time: firestore.getServerTimestamp(),
                expires_at: expiresAt
            })
            
            await firestore.updateDoc('users', user.email, {
                last_login: firestore.getServerTimestamp()
            })
            
            return true
        } catch (error) {
            console.error('Error in auto_login:', error)
            return false
        }
    }

    get_user = async (email) => {
        const user = await firestore.getDoc('users', email)
        return user || false
    }

    login = async (session, email, password) => {
        const user = await this.get_user(email)
        
        if (user && user.password_encrypted === bcrypt.hashSync(password, user.password_salt)) {
            const expiry = parseInt(process.env.SESSION_COOKIE_LOGGED_EXPIRY)
            const expiresAt = new Date(Date.now() + expiry * 1000)
            
            try {
                await firestore.updateDoc('sessions', session.sid, {
                    user_id: user.email,
                    login_time: firestore.getServerTimestamp(),
                    expires_at: expiresAt
                })
                
                await firestore.updateDoc('users', user.email, {
                    last_login: firestore.getServerTimestamp()
                })
                
                return true
            } catch (error) {
                console.error('Error in login:', error)
                return false
            }
        }
        
        return false
    }

    logout = async (session) => {
        const expiry = parseInt(process.env.SESSION_COOKIE_EXPIRY)
        const expiresAt = new Date(Date.now() + expiry * 1000)
        
        try {
            await firestore.updateDoc('sessions', session.sid, {
                user_id: null,
                login_time: null,
                expires_at: expiresAt
            })
            return true
        } catch (error) {
            console.error('Error in logout:', error)
            return false
        }
    }

    reset_request = async (email) => {
        const user = await this.get_user(email)
        
        if (user) {
            const reset_code = uuid.v4()
            await firestore.updateDoc('users', email, {
                reset_code: reset_code
            })
            return { ...user, reset_code: reset_code }
        }
        
        return false
    }

    reset_lookup = async (rcode) => {
        const users = await firestore.query('users', [
            { field: 'reset_code', operator: '==', value: rcode }
        ])
        
        if (users.length > 0) {
            return users[0]
        }
        
        return false
    }

    reset_password = async (session, form) => {
        const users = await firestore.query('users', [
            { field: 'reset_code', operator: '==', value: form.rcode }
        ])
        
        if (users.length > 0) {
            const user = users[0]
            
            await firestore.updateDoc('users', user.email, {
                reset_code: null,
                password_salt: form.password_salt,
                password_encrypted: form.password_encrypted
            })
            
            await firestore.updateDoc('sessions', session.sid, {
                user_id: user.email,
                login_time: firestore.getServerTimestamp()
            })
            
            return user
        }
        
        return false
    }

    get_user_by_email = async (email) => {
        return await this.get_user(email)
    }

    generate_new_verification_code = async (email) => {
        const new_code = uuid.v4()
        
        try {
            await firestore.updateDoc('users', email, {
                validate_code: new_code
            })
            return new_code
        } catch (error) {
            console.error('Error generating verification code:', error)
            return false
        }
    }

    update_agent_status = async (email, isAgent) => {
        const status = isAgent ? ['agent'] : []
        
        try {
            await firestore.updateDoc('users', email, {
                status: status
            })
            const user = await this.get_user(email)
            return user
        } catch (error) {
            console.error('Error updating agent status:', error)
            return false
        }
    }
}

module.exports = new account()