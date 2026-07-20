#!/usr/bin/env node
// Usage:
// node scripts/test_circle_webhook.js --url http://localhost:3000/api/circle/webhook --txId TX_ID --status settled --amount 1000 --auditId AUDIT_ID --feeId FEE_ID --insert true

const crypto = require("crypto")
const http = require("http")
const https = require("https")

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY

function parseArgs() {
  const args = {}
  for (let i = 2; i < process.argv.length; i++) {
    const a = process.argv[i]
    if (a.startsWith("--")) {
      const k = a.slice(2)
      const v = process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[++i] : "true"
      args[k] = v
    }
  }
  return args
}

async function sendWebhook(url, payload) {
  const raw = JSON.stringify(payload)
  const secret = process.env.CIRCLE_WEBHOOK_SECRET || null
  let signature = null
  if (secret) signature = crypto.createHmac("sha256", secret).update(raw).digest("hex")

  const target = new URL(url)
  const opts = {
    method: "POST",
    hostname: target.hostname,
    port: target.port || (target.protocol === "https:" ? 443 : 80),
    path: target.pathname + (target.search || ""),
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(raw),
    },
  }

  if (signature) opts.headers["x-circle-signature"] = signature

  const lib = target.protocol === "https:" ? https : http

  return new Promise((resolve, reject) => {
    const req = lib.request(opts, (res) => {
      let body = ""
      res.on("data", (c) => (body += c.toString()))
      res.on("end", () => resolve({ status: res.statusCode, body }))
    })

    req.on("error", (err) => reject(err))
    req.write(raw)
    req.end()
  })
}

async function insertAuditFeeRow(txId, amount, userId = "test-user-1", sourceAddress = "0xdeadbeef") {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for inserting test row")
  }

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/audit_fees`
  const body = {
    user_id: userId,
    amount: amount,
    status: "authorized",
    refund_external_id: txId,
    source_address: sourceAddress,
    created_at: new Date().toISOString(),
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Supabase insert failed: ${res.status} ${t}`)
  }

  const data = await res.json()
  return data && data[0]
}

async function fetchAuditFeeByTx(txId) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/audit_fees?refund_external_id=eq.${encodeURIComponent(txId)}&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Supabase fetch failed: ${res.status} ${t}`)
  }
  return res.json()
}

async function insertAuditRow(auditFeeId, userId = "test-user-1", repoUrl = "https://example.com/repo.git") {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars for inserting test audit row")
  }

  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/audits`
  const body = {
    user_id: userId,
    repo_url: repoUrl,
    status: "queued",
    audit_fee_id: auditFeeId,
    created_at: new Date().toISOString(),
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=representation",
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Supabase insert audit failed: ${res.status} ${t}`)
  }

  const data = await res.json()
  return data && data[0]
}

async function fetchAuditById(id) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/audits?id=eq.${encodeURIComponent(id)}&select=*`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Supabase fetch audit failed: ${res.status} ${t}`)
  }
  return res.json()
}

async function run() {
  const args = parseArgs()
  const webhookUrl = args.url || process.env.WEBHOOK_URL || "http://localhost:3000/api/circle/webhook"
  const txId = args.txId || process.env.TEST_TX_ID || "test-tx-123"
  const status = args.status || "settled"
  const amount = Number(args.amount || 1000)
  const auditId = args.auditId || null
  const feeId = args.feeId || null
  const shouldInsert = args.insert === "true" || args.insert === "1" || args.insert === "yes"

  const payload = {
    type: "transaction.updated",
    data: {
      id: txId,
      status: status,
      amount,
    },
  }

  if (auditId) payload.data.auditId = auditId
  if (feeId) payload.data.feeId = feeId

  let createdFee = null
  let createdAudit = null

  if (shouldInsert) {
    console.log("Inserting test audit_fees row into Supabase...")
    createdFee = await insertAuditFeeRow(txId, amount)
    console.log("Inserted fee row:", createdFee)

    console.log("Inserting linked audit row into Supabase...")
    createdAudit = await insertAuditRow(createdFee.id)
    console.log("Inserted audit row:", createdAudit)
  }

  console.log("Sending webhook to", webhookUrl)
  const res = await sendWebhook(webhookUrl, payload)
  console.log("Webhook response:", res)

  if (shouldInsert) {
    console.log("Polling audit_fees for notify status...")
    const start = Date.now()
    let feeRow
    while (Date.now() - start < 30000) {
      const rows = await fetchAuditFeeByTx(txId)
      if (rows && rows.length > 0) {
        feeRow = rows[0]
        console.log("audit_fees row:", feeRow)
        break
      }
      await new Promise((r) => setTimeout(r, 1000))
    }

    if (feeRow && feeRow.notify_status) {
      console.log("notify_status:", feeRow.notify_status)
    }

    // Poll audits table for the created audit
    if (createdAudit) {
      console.log("Polling created audit for status updates...")
      const start2 = Date.now()
      while (Date.now() - start2 < 30000) {
        const rows = await fetchAuditById(createdAudit.id)
        if (rows && rows.length > 0) {
          console.log("audit row:", rows[0])
          if (rows[0].status && rows[0].status !== "queued") break
        }
        await new Promise((r) => setTimeout(r, 1000))
      }
    }
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
