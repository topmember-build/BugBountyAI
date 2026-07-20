Test Circle webhook and deposit flow

1) Create a test `audit_fees` row in your database so the webhook can find it.

Example SQL (adjust schema / columns as needed):

```sql
INSERT INTO audit_fees (user_id, amount, status, refund_external_id, source_address, created_at)
VALUES ('test-user-1', 1000, 'authorized', 'test-tx-123', '0xdeadbeef', now());
```

2) Start your Next dev server:

```bash
npm run dev
```

3) Run the test script to simulate a settled Circle event (it will send `x-circle-signature` if `CIRCLE_WEBHOOK_SECRET` env var is set):

```bash
node scripts/test_circle_webhook.js --url http://localhost:3000/api/circle/webhook --txId test-tx-123 --status settled --amount 1000
```

4) Check your server logs and the `audit_fees` row — it should be updated to `status = 'settled'` and the webhook will attempt `notifyContractDeposit` if an `audits` row is linked.

Notes:
- This script doesn't modify your DB — you must create the `audit_fees` row yourself (or adapt the script to use Supabase admin client).
- In production, configure `CIRCLE_WEBHOOK_SECRET` and ensure your endpoint is reachable by Circle.
