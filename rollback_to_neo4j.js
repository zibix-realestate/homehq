#!/usr/bin/env node

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
        console.log(`✓ Restored: ${originalPath}`)
      }
    })
  }
  
  // Restore main files
  backupFiles.forEach(backup => {
    const backupPath = path.join(__dirname, backup)
    if (fs.existsSync(backupPath)) {
      const originalPath = backupPath.replace('.neo4j.backup', '')
      fs.copyFileSync(backupPath, originalPath)
      console.log(`✓ Restored: ${originalPath}`)
    }
  })
  
  // Restore pages
  findBackups(path.join(__dirname, 'pages'))
  
  console.log('\n✓ Rollback complete!')
}

rollback()
