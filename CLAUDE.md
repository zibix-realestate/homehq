# HomeHQ Project - Claude Assistant Documentation

## Quick Reference

**Start Server**: `pkill -f "node app.js" && nohup node app.js > homehq.log 2>&1 &`
**Check Status**: `ps aux | grep "node app.js"`
**View Logs**: `tail -f homehq.log`
**Restart & Push**: Always restart server after template/CSS changes, then commit/push for production

## Project Overview

HomeHQ is a modern web application built on Node.js/Express with Neo4j database integration. Originally based on "plainsofeternity" structure, redesigned with white theme and modern UI elements.

## Architecture

- **Backend**: Node.js with Express framework
- **Database**: Neo4j graph database (remote connection at 164.90.128.207:7687)
- **Templating**: Twig templating engine
- **Session Management**: Custom Neo4j-based session storage with TTL
- **Authentication**: bcrypt password hashing with email verification
- **Email Service**: Postmark integration for account verification and password resets
- **Routing**: Custom router system (@router alias)
- **Deployment**: Digital Ocean app platform

## Key Features

- User account management (registration, login, password reset, resend verification)
- Email verification system with Postmark
- Session-based authentication with Neo4j storage
- Responsive white theme design
- Technical documentation home page
- Kubernetes health check filtering (kube-probe)

## File Structure

```
/Users/ericwiltshire/Desktop/claude/zibix/
├── app.js                          # Main Express application
├── package.json                    # Node.js dependencies  
├── .env                           # Environment variables (not in repo)
├── CLAUDE.md                      # This context file
├── classes/
│   ├── account.js                 # User management methods
│   ├── email.js                   # Postmark email integration
│   ├── neo4j.js                   # Database connection
│   ├── router.js                  # Custom routing system
│   └── session.js                 # Session management with Neo4j
├── config/
│   └── routes.js                  # Route definitions
├── emails/
│   ├── account_create_thankyou.json  # Email templates
│   └── account_reset_request.json
├── pages/                         # Controllers (MVC pattern)
│   ├── home.js
│   └── account/
│       ├── account_create.js
│       ├── account_login.js
│       ├── account_logout.js
│       ├── account_profile.js
│       ├── account_resend_verification.js
│       ├── account_reset.js
│       ├── account_reset_request.js
│       └── account_verify.js
├── public/
│   ├── css/
│   │   └── lost.css               # Main stylesheet (white theme)
│   ├── images/
│   │   └── zibix_logo.svg
│   └── js/
│       └── lost.js
├── templates/                     # Twig templates
│   ├── layouts/
│   │   └── main.twig              # Main layout with navigation
│   ├── home.twig                  # Technical documentation page
│   └── account/
│       ├── account_*.twig         # All account-related templates
└── zibix.log                      # Server logs
```

## Design System

### Color Palette
- **Background**: Dark gradient (`#0a0a0a` → `#1a1a1a` → `#2a2a2a`)
- **Primary Accent**: `#ff6b6b` (coral red)
- **Secondary Accents**: `#ffd93d` (yellow), `#6bcf7f` (green), `#4dabf7` (blue)
- **Text**: `#e0e0e0` (light gray), `#b0b0b0` (medium gray)

### Typography
- **Font Family**: Georgia, serif (matching perspicacious.com)
- **Navigation**: 16px, font-weight 300
- **Headers**: Various sizes with letter-spacing
- **Body**: 16px, line-height 1.6

### Effects
- **Glass Morphism**: `backdrop-filter: blur(10px)` with transparent backgrounds
- **Gradient Borders**: Rainbow gradient accents on navigation and forms
- **Hover Animations**: Transform and shadow effects
- **Responsive Design**: Mobile-first approach with breakpoints

## Development Commands

```bash
# Install dependencies
npm install

# Start server with auto-restart (RECOMMENDED FOR DEVELOPMENT)
npm run dev

# Start server (production)
npm start

# Start server (background) - Legacy method
nohup node app.js > zibix.log 2>&1 &

# Stop server
pkill -f "node app.js"

# Check if server is running
ps aux | grep "node app.js"
```

**RECOMMENDED**: Use `npm run dev` for development work. This automatically restarts the server when files change (JS, Twig templates, JSON, CSS files).

### Auto-Restart Development Mode
- **Command**: `npm run dev`
- **Watches**: All `.js`, `.twig`, `.json`, and `.css` files
- **Ignores**: `node_modules/` and `zibix.log`
- **Benefits**: Automatically restarts server when you make changes to templates, styles, or code

## Configuration

### Environment Variables (.env)
- `NEO4J_URI`: Neo4j database connection string
- `NEO4J_USER`: Database username
- `NEO4J_PASSWORD`: Database password
- `SENDGRID_API_KEY`: SendGrid API key for email services
- `COOKIE_SECRET`: Session cookie encryption key
- `DOMAIN`: Application domain for email links

### Database
- Uses Neo4j graph database for user management and sessions
- Remote connection configured in .env file
- Custom session storage implementation

## Database Schema (Neo4j)

### Node Types

**USER**
```
- email: string (unique identifier)
- username: string
- username_ext: integer (for duplicate usernames)
- password_salt: string (bcrypt)
- password_encrypted: string (bcrypt)
- cdt: datetime (created date)
- validated: boolean
- validate_code: uuid (for email verification)
- login_code: uuid
- reset_code: uuid (for password reset)
- flagged: boolean
```

**SESSION**
```
- sid: uuid (session identifier)
- cdt: datetime (created)
- udt: datetime (updated)
- velocity: integer (request frequency)
- max_velocity: integer
- ipa: string (IP address)
- iparray: array (IP history)
- uagent: string (user agent)
- uarray: array (user agent history)  
- ttl: integer (time to live)
- pv.*: payload values (session data)
- pj.*: payload JSON (session data)
```

**FORM** (temporary form data storage)
```
- sid: uuid (session reference)
- form: string (form name)
- data: JSON string (form data)
- TTL: 30 minutes
```

### Relationships
- `SESSION -[LOGGED]-> USER` (login relationship with cdt timestamp)

## Key Classes & Methods

### account.js
```javascript
- check_existing_email(email) // Check if email exists
- create_user(form) // Create new user with validation
- verify(vcode) // Verify user with validation code
- auto_login(session, user) // Auto-login after verification
- get_user(email) // Get user by email
- login(session, email, password) // Standard login
- logout(session) // Remove login relationship
- reset_request(email) // Generate password reset code
- reset_lookup(rcode) // Find user by reset code
- reset_password(session, form) // Complete password reset
- get_user_by_email(email) // Alias for get_user
- generate_new_verification_code(email) // For resend verification
```

### session.js
```javascript
- update(req, res, params) // Update session in Neo4j
- session_cookie(req, res) // Handle session cookie
- get_form(sid, form) // Retrieve temporary form data
- save_form(sid, form, data) // Store temporary form data
- delete_form(sid, form) // Remove temporary form data
```

### email.js (Postmark)
```javascript
- send(params) // Send email via Postmark
  // params: {to, from, subject, text, html}
```

## Environment Variables

```
PORT=3000                           # Server port
DOMAIN=http://localhost:3000        # Base domain for emails
NEO4J_URI=neo4j://164.90.128.207:7687  # Database connection
NEO4J_USER=neo4j                    # Database username
NEO4J_PASSWORD=***                  # Database password
NEO4J_DATABASE=zibix                # Database name
SESSION_COOKIE_NAME=zibix           # Cookie name
SESSION_COOKIE_DOMAIN=zibix.com     # Cookie domain (production)
SESSION_COOKIE_EXPIRY=2592000       # 30 days in seconds
SESSION_COOKIE_LOGGED_EXPIRY=7776000 # 90 days for logged users
POSTMARK_API_KEY=***                # Email service API key
```

## Common Development Patterns

### Controller Structure
```javascript
class controller_name {
  _invoke = async (req, res) => {
    let session = await session_data.update(req,res,{})
    let form = await session_data.get_form(session.sid,'form_name')
    let errors = {}
    
    // Handle POST data
    if(req.body.form_submit) {
      // Validation logic
      // Save form on error: session_data.save_form()
      // Delete form on success: session_data.delete_form()
    }
    
    res.render('template.twig', {session, form, errors})
  }
}
module.exports = new controller_name()
```

### Route Definition
```javascript
// In config/routes.js
Router.get('/path', 'controller_name')
Router.post('/path', 'controller_name')
```

### Email Sending
```javascript
let email_object = require('@emails/template.json')
await mail.send({
  to: email,
  from: { email: 'admin@zibix.com', name: 'Zibix Admin Team' },
  subject: email_object.subject,
  text: twig.twig({data: email_object.text}).render(data),
  html: twig.twig({data: email_object.html}).render(data)
})
```

## Current Status

✅ **White theme redesign** - Clean, readable interface
✅ **Technical home page** - Architecture documentation
✅ **Session management** - Working across page loads
✅ **Account system** - Create, login, verify, reset, resend verification
✅ **Email integration** - Postmark for reliable delivery
✅ **Production deployment** - Digital Ocean with environment variables
✅ **Health checks** - Kubernetes probe filtering

## Known Issues & Solutions

- **Cross-platform deployment**: Use environment variables, avoid committing node_modules
- **Session persistence**: Ensure SESSION_COOKIE_DOMAIN matches deployment domain
- **Text readability**: Use #000000 (black) instead of gray colors for better contrast
- **Template changes**: Always restart server after template/CSS modifications

## Server Information
- **Local Development**: http://localhost:3000
- **Production**: https://zibix.com
- **Log File**: zibix.log (for background processes)
- **Session Cookie**: "zibix" with domain-specific settings