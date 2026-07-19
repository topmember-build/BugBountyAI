#!/usr/bin/env node
const { execSync } = require('child_process')

function run(cmd) {
  console.log('>', cmd)
  try {
    const out = execSync(cmd, { stdio: 'inherit' })
    return out
  } catch (e) {
    console.error('Command failed:', cmd)
    process.exit(1)
  }
}

const message = process.argv.slice(2).join(' ') || 'chore: update'

// Stage all changes
run('git add -A')
// Commit
run(`git commit -m "${message.replace(/"/g, '\\"')}"`)
// Push to origin main
run('git push origin main')

console.log('Pushed to origin main')
