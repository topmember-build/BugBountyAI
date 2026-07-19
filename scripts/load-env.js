const fs = require('fs')
const path = require('path')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return

  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue

    const key = match[1]
    let value = match[2]

    if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1)
    } else if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }

    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

const repoRoot = process.cwd()
loadEnvFile(path.join(repoRoot, '.env.development.local'))
loadEnvFile(path.join(repoRoot, '.env'))
