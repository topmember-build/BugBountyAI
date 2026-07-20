#!/usr/bin/env node
// Simple script to call the local notify-retries endpoint
const http = require('http')
const https = require('https')

const url = process.argv[2] || process.env.WEBHOOK_RETRIES_URL || 'http://localhost:3000/api/circle/notify-retries'
const target = new URL(url)
const lib = target.protocol === 'https:' ? https : http

const opts = {
  method: 'POST',
  hostname: target.hostname,
  port: target.port || (target.protocol === 'https:' ? 443 : 80),
  path: target.pathname + (target.search || ''),
}

const req = lib.request(opts, (res) => {
  let body = ''
  res.on('data', (c) => body += c.toString())
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    console.log('Body:', body)
  })
})

req.on('error', (err) => console.error('Request error', err))
req.end()
