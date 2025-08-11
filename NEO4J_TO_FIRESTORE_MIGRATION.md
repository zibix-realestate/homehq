# Neo4j to Firestore Migration Analysis

## 1. API Touchpoints

### Core Classes with Neo4j Dependencies

#### **neo4j.js** (classes/neo4j.js)
- Direct Neo4j driver wrapper
- `query()` method used throughout the application
- Needs complete replacement with Firestore client

#### **session.js** (classes/session.js)
- **Lines 17-53**: `update()` - MERGE session with TTL, complex updates
- **Lines 117-129**: `get_form()` - MATCH form data
- **Lines 131-143**: `save_form()` - MERGE form with TTL
- **Lines 145-153**: `delete_form()` - DELETE form

#### **account.js** (classes/account.js)
- **Lines 12-23**: `check_existing_email()` - MATCH user by email
- **Lines 26-62**: `create_user()` - CREATE user with username conflict resolution
- **Lines 64-79**: `verify()` - MATCH and SET validation
- **Lines 81-103**: `auto_login()` - Create LOGGED relationship
- **Lines 105-118**: `get_user()` - MATCH user
- **Lines 120-148**: `login()` - Verify password and create LOGGED relationship
- **Lines 150-163**: `logout()` - DELETE LOGGED relationship
- **Lines 166-182**: `reset_request()` - SET reset code
- **Lines 184-197**: `reset_lookup()` - MATCH by reset code
- **Lines 199-227**: `reset_password()` - Complex update with relationship change
- **Lines 234-248**: `generate_new_verification_code()` - SET new code
- **Lines 254-269**: `update_agent_status()` - SET status array

### Controllers with Direct Neo4j Queries

#### **agent_landing.js** (pages/agent/agent_landing.js)
- **Lines 14-20**: Direct query to find agent users

#### **account_otp_request.js** (pages/account/account_otp_request.js)
- **Lines 29-41**: Direct query to store OTP in session

#### **account_otp_verify.js** (pages/account/account_otp_verify.js)
- **Lines 21-33**: Direct query to verify OTP
- **Lines 61-66**: Direct query to clean up OTP data

## 2. Firestore Collection Structure

### Collections and Documents

```javascript
// USERS Collection
users/{userId}
{
  email: string,              // Unique identifier
  username: string,
  username_ext: number,       // For duplicate usernames
  password_salt: string,
  password_encrypted: string,
  created_at: timestamp,      // Replaces cdt
  validated: boolean,
  validate_code: string,      // nullable
  login_code: string,
  reset_code: string,         // nullable
  flagged: boolean,
  status: array,              // ['agent'] or []
  
  // Denormalized session info (optional)
  last_login: timestamp,
  active_sessions: number
}

// SESSIONS Collection
sessions/{sessionId}
{
  sid: string,                // Session ID
  created_at: timestamp,      // Replaces cdt
  updated_at: timestamp,      // Replaces udt
  expires_at: timestamp,      // TTL replacement
  velocity: number,
  max_velocity: number,
  ip_address: string,         // Replaces ipa
  ip_history: array,          // Replaces iparray
  user_agent: string,         // Replaces uagent
  ua_history: array,          // Replaces uarray
  
  // User relationship (replaces LOGGED relationship)
  user_id: string,            // Email of logged-in user (nullable)
  login_time: timestamp,      // When user logged in
  
  // Payload data (flattened)
  payload: map,               // Replaces pv.* and pj.*
  
  // OTP fields (temporary)
  otp_code: string,
  otp_email: string,
  otp_expiry: timestamp
}

// FORMS Collection (temporary form storage)
forms/{formId}
{
  session_id: string,         // Reference to session
  form_name: string,          // Form identifier
  data: map,                  // Form data as object
  created_at: timestamp,
  expires_at: timestamp       // TTL replacement
}

// USERNAME_REGISTRY Collection (for username uniqueness)
username_registry/{username}
{
  base_username: string,
  last_extension: number,     // Track highest extension number
  users: array                // List of emails using this username
}
```

### Indexes Required

```javascript
// Firestore Composite Indexes needed:

// 1. Users collection
- email (unique constraint via application logic)
- validate_code (for email verification)
- reset_code (for password reset)
- username + username_ext (for agent lookups)
- status array-contains 'agent' + username

// 2. Sessions collection
- sid (primary lookup)
- user_id + updated_at (for user session queries)
- expires_at (for TTL cleanup via Cloud Functions)

// 3. Forms collection
- session_id + form_name (composite for form retrieval)
- expires_at (for TTL cleanup)
```

## 3. Neo4j to Firestore Operation Mapping

### Session Operations

| Neo4j Operation | Firestore Equivalent |
|----------------|---------------------|
| `MERGE (s:SESSION {sid:$sid})` with ON CREATE/MATCH | `doc.set()` with merge option or transaction |
| `CALL apoc.ttl.expireIn()` | Set `expires_at` field + Cloud Function for cleanup |
| `OPTIONAL MATCH (s)-[l:LOGGED]->(u:USER)` | Check `user_id` field and fetch user doc |
| Complex velocity calculations | Transaction with field increments |

### User Operations

| Neo4j Operation | Firestore Equivalent |
|----------------|---------------------|
| `MATCH (user:USER {email:$email})` | `collection('users').doc(email).get()` |
| `CREATE (user:USER)` | `collection('users').doc(email).set()` |
| Username conflict resolution | Transaction on username_registry |
| `MERGE (session)-[logged:LOGGED]->(user)` | Update session doc with user_id |
| `DELETE logged` | Update session doc, remove user_id |

### Form Operations

| Neo4j Operation | Firestore Equivalent |
|----------------|---------------------|
| `MERGE (fm:FORM {sid:$sid,form:$form})` | `collection('forms').doc(sid_form).set()` |
| `MATCH (fm:FORM)` | `collection('forms').where()` query |
| `DELETE fm` | `doc.delete()` |

## 4. Key Migration Challenges

### 1. TTL Implementation
**Neo4j**: Uses `apoc.ttl.expireIn()` for automatic expiration
**Firestore**: Requires Cloud Functions with scheduled triggers to delete expired documents

### 2. Complex Queries
**Neo4j**: Graph relationships allow complex queries in single statement
**Firestore**: May require multiple queries and client-side joins

### 3. Atomic Operations
**Neo4j**: MERGE operations with conditional logic
**Firestore**: Use transactions for atomic updates

### 4. Username Uniqueness
**Neo4j**: Complex query for username_ext calculation
**Firestore**: Maintain separate username_registry collection with transactions

### 5. Session-User Relationships
**Neo4j**: LOGGED relationship between nodes
**Firestore**: Denormalized user_id field in session document

## 5. Migration Steps

1. **Install Firestore SDK**
   - Add Firebase Admin SDK to package.json
   - Create Firestore configuration class

2. **Create Firestore Wrapper Class**
   - Replace neo4j.js with firestore.js
   - Implement connection and basic operations

3. **Migrate Session Class**
   - Rewrite all queries to use Firestore
   - Implement TTL with timestamps
   - Handle session-user relationships

4. **Migrate Account Class**
   - Convert all user operations
   - Implement username registry
   - Handle email uniqueness

5. **Update Controllers**
   - Replace direct Neo4j queries
   - Update error handling

6. **Create Cloud Functions**
   - TTL cleanup function (runs periodically)
   - Username registry maintenance

7. **Data Migration Script**
   - Export existing Neo4j data
   - Transform to Firestore structure
   - Import with proper indexes

## 6. Firestore Benefits

- Better integration with other Google Cloud services
- Automatic scaling and managed infrastructure
- Real-time updates (if needed)
- Better client SDK support
- Built-in offline support (for future mobile apps)

## 7. Potential Issues

- No built-in TTL (requires Cloud Functions)
- Less flexible for complex graph queries
- Different transaction model
- Query limitations (no JOINs)
- Cost model differences (read/write operations vs compute)