import { AuditDetail } from "@/components/dashboard/audit-detail"

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <AuditDetail auditId={id} />
}
