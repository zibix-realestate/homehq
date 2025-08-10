const Router = require('@router')

Router.get('/', 'home');

// account routes
Router.get('/account/create', 'account/account_create');
Router.post('/account/create', 'account/account_create');
Router.get('/account/verify', 'account/account_verify');
Router.get('/account/login', 'account/account_login');
Router.post('/account/login', 'account/account_login');
Router.get('/account/logout', 'account/account_logout');
Router.get('/account/reset-request', 'account/account_reset_request');
Router.post('/account/reset-request', 'account/account_reset_request');
Router.get('/account/reset', 'account/account_reset');
Router.post('/account/reset', 'account/account_reset');
Router.get('/account/profile', 'account/account_profile');
Router.post('/account/profile', 'account/account_profile');
Router.get('/account/resend-verification', 'account/account_resend_verification');
Router.post('/account/resend-verification', 'account/account_resend_verification');

// Agent routes
Router.get('/agent/:username', 'agent/agent_landing');

// OAuth routes
Router.get('/auth/google', 'auth/google@authenticate');
Router.get('/auth/google/callback', 'auth/google@callback');

// OTP routes
Router.get('/account/otp-request', 'account/account_otp_request');
Router.post('/account/otp-request', 'account/account_otp_request');
Router.get('/account/otp-verify', 'account/account_otp_verify');
Router.post('/account/otp-verify', 'account/account_otp_verify');

module.exports = Router.router