"use client"
import React, { useEffect, useState } from "react"

type FeeRow = {
  id: string
  user_id?: string
  amount?: number
  source_address?: string
  refund_external_id?: string
  notify_status?: string
  notify_attempts?: number
  notify_retry_at?: string
  last_notify_error?: string
  notify_tx_hash?: string
  created_at?: string
}

export default function NotifyFailures() {
  const [rows, setRows] = useState<FeeRow[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetch(`/api/admin/notify-failures?status=retry_scheduled&page=1&per=100`)
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return
        setRows(data.data || [])
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
    return () => { mounted = false }
  }, [refreshKey])

  async function retryRow(id: string) {
    try {
      const res = await fetch(`/api/admin/notify-failures/retry`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ feeId: id }) })
      const data = await res.json()
      alert(JSON.stringify(data))
      setRefreshKey((k) => k + 1)
    } catch (err) {
      console.error(err)
      alert("Retry failed")
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>Pending Notify Retries</h2>
        <button onClick={() => setRefreshKey((k) => k + 1)}>Refresh</button>
      </div>
      {loading ? <p>Loading...</p> : null}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Amount</th>
            <th>Source</th>
            <th>Status</th>
            <th>Attempts</th>
            <th>Retry At</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid #ddd" }}>
              <td>{r.id}</td>
              <td>{r.amount}</td>
              <td>{r.source_address}</td>
              <td>{r.notify_status}</td>
              <td>{r.notify_attempts ?? 0}</td>
              <td>{r.notify_retry_at ?? "-"}</td>
              <td>
                <button onClick={() => retryRow(r.id)}>Retry</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
