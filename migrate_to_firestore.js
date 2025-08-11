#!/usr/bin/env node

require('dotenv').config()
const fs = require('fs')
const path = require('path')

// Configuration for file replacements
const replacements = [
  {
    original: 'classes/neo4j',
    firestore: 'classes/firestore',
    files: ['app.js']
  },
  {
    original: 'classes/session',
    firestore: 'classes/session_firestore',
    files: ['app.js', 'pages/**/*.js']
  },
  {
    original: 'classes/account',
    firestore: 'classes/account_firestore',
    files: ['pages/**/*.js']
  },
  {
    original: 'pages/agent/agent_landing',
    firestore: 'pages/agent/agent_landing_firestore',
    files: ['config/routes.js']
  },
  {
    original: 'pages/account/account_otp_request',
    firestore: 'pages/account/account_otp_request_firestore',
    files: ['config/routes.js']
  },
  {
    original: 'pages/account/account_otp_verify',
    firestore: 'pages/account/account_otp_verify_firestore',
    files: ['config/routes.js']
  }
]

// Backup original files
function backupFile(filePath) {
  const backupPath = filePath + '.neo4j.backup'
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(filePath, backupPath)
    console.log(`✓ Backed up: ${filePath}`)
  }
}

// Replace require statements in files
function updateRequireStatements() {
  console.log('\n=== Updating require statements ===\n')
  
  // Update app.js
  const appPath = path.join(__dirname, 'app.js')
  if (fs.existsSync(appPath)) {
    backupFile(appPath)
    let content = fs.readFileSync(appPath, 'utf8')
    
    // Replace neo4j with firestore
    content = content.replace(
      "require('@classes/neo4j')",
      "require('@classes/firestore')"
    )
    
    // Replace session with session_firestore
    content = content.replace(
      "require('@classes/session')",
      "require('@classes/session_firestore')"
    )
    
    fs.writeFileSync(appPath, content)
    console.log('✓ Updated app.js')
  }
  
  // Update routes.js
  const routesPath = path.join(__dirname, 'config', 'routes.js')
  if (fs.existsSync(routesPath)) {
    backupFile(routesPath)
    let content = fs.readFileSync(routesPath, 'utf8')
    
    // Replace controller paths
    content = content.replace(
      "'agent/agent_landing'",
      "'agent/agent_landing_firestore'"
    )
    content = content.replace(
      "'account/account_otp_request'",
      "'account/account_otp_request_firestore'"
    )
    content = content.replace(
      "'account/account_otp_verify'",
      "'account/account_otp_verify_firestore'"
    )
    
    fs.writeFileSync(routesPath, content)
    console.log('✓ Updated config/routes.js')
  }
  
  // Update all page controllers
  const pagesDir = path.join(__dirname, 'pages')
  updatePagesDirectory(pagesDir)
}

function updatePagesDirectory(dir) {
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)
    
    if (stat.isDirectory()) {
      updatePagesDirectory(filePath)
    } else if (file.endsWith('.js') && !file.includes('_firestore')) {
      // Check if Firestore version exists
      const firestorePath = filePath.replace('.js', '_firestore.js')
      if (fs.existsSync(firestorePath)) {
        // Skip files that have Firestore versions
        return
      }
      
      backupFile(filePath)
      let content = fs.readFileSync(filePath, 'utf8')
      let modified = false
      
      // Replace session require
      if (content.includes("require('@classes/session')")) {
        content = content.replace(
          "require('@classes/session')",
          "require('@classes/session_firestore')"
        )
        modified = true
      }
      
      // Replace account require
      if (content.includes("require('@classes/account')")) {
        content = content.replace(
          "require('@classes/account')",
          "require('@classes/account_firestore')"
        )
        modified = true
      }
      
      // Replace neo4j require (if any)
      if (content.includes("require('@classes/neo4j')")) {
        content = content.replace(
          "require('@classes/neo4j')",
          "require('@classes/firestore')"
        )
        modified = true
      }
      
      if (modified) {
        fs.writeFileSync(filePath, content)
        console.log(`✓ Updated ${filePath}`)
      }
    }
  })
}

// Create a rollback script
function createRollbackScript() {
  const rollbackScript = `#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

function rollback() {
  console.log('Rolling back to Neo4j...')
  
  const backupFiles = [
    'app.js.neo4j.backup',
    'config/routes.js.neo4j.backup'
  ]
  
  // Find all backup files in pages directory
  function findBackups(dir) {
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        findBackups(filePath)
      } else if (file.endsWith('.neo4j.backup')) {
        const originalPath = filePath.replace('.neo4j.backup', '')
        fs.copyFileSync(filePath, originalPath)
        console.log(\`✓ Restored: \${originalPath}\`)
      }
    })
  }
  
  // Restore main files
  backupFiles.forEach(backup => {
    const backupPath = path.join(__dirname, backup)
    if (fs.existsSync(backupPath)) {
      const originalPath = backupPath.replace('.neo4j.backup', '')
      fs.copyFileSync(backupPath, originalPath)
      console.log(\`✓ Restored: \${originalPath}\`)
    }
  })
  
  // Restore pages
  findBackups(path.join(__dirname, 'pages'))
  
  console.log('\\n✓ Rollback complete!')
}

rollback()
`

  fs.writeFileSync('rollback_to_neo4j.js', rollbackScript)
  fs.chmodSync('rollback_to_neo4j.js', '755')
  console.log('\n✓ Created rollback script: rollback_to_neo4j.js')
}

// Main migration function
async function migrate() {
  console.log('=================================')
  console.log('Neo4j to Firestore Migration')
  console.log('=================================\n')
  
  console.log('This will update your application to use Firestore instead of Neo4j.')
  console.log('Backup files will be created with .neo4j.backup extension.\n')
  
  // Check if Firestore credentials are set
  if (!process.env.FIREBASE_PROJECT_ID && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ Error: Firestore credentials not found in environment variables.')
    console.error('Please ensure FIREBASE_PROJECT_ID or GOOGLE_APPLICATION_CREDENTIALS is set.')
    process.exit(1)
  }
  
  try {
    // Update require statements
    updateRequireStatements()
    
    // Create rollback script
    createRollbackScript()
    
    console.log('\n=================================')
    console.log('✓ Migration Complete!')
    console.log('=================================\n')
    console.log('Next steps:')
    console.log('1. Restart your application')
    console.log('2. Test all functionality')
    console.log('3. If issues occur, run: node rollback_to_neo4j.js')
    console.log('\nNote: This migration only updates the code.')
    console.log('You may need to migrate existing data from Neo4j to Firestore separately.')
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    console.error('Run rollback_to_neo4j.js to restore original files')
    process.exit(1)
  }
}

// Run migration
migrate()