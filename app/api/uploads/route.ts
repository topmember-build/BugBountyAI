import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ensureStorageBucket } from "@/lib/supabase/init-storage"

const BUCKET_NAME = "audit-archives"
const ALLOWED_EXTENSIONS = [".zip", ".tar", ".gz", ".7z"]

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (parseError) {
    console.error("Failed to parse upload request form data", parseError)
    return NextResponse.json(
      { error: "Unable to parse uploaded archive. Please try again with a valid ZIP file." },
      { status: 400 },
    )
  }

  const fileValue = formData.get("file")

  if (!fileValue || typeof fileValue === "string") {
    return NextResponse.json({ error: "A file is required." }, { status: 400 })
  }

  const file = fileValue as File
  const fileName = file.name
  const validExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext))

  if (!validExtension) {
    return NextResponse.json(
      { error: "Please upload a ZIP or compressed source archive (.zip, .tar, .gz, .7z)." },
      { status: 400 },
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const objectPath = `${user.id}/${Date.now()}-${fileName}`
  const admin = createAdminClient()

  // Ensure the storage bucket exists before attempting upload
  const bucketReady = await ensureStorageBucket()
  if (!bucketReady) {
    return NextResponse.json(
      { error: "Storage bucket is not available. Please try again later." },
      { status: 503 },
    )
  }

  const uploadFile = async () => {
    return await admin.storage.from(BUCKET_NAME).upload(objectPath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    })
  }

  let uploadResult = await uploadFile()

  if (uploadResult.error?.status === 404) {
    console.log("Bucket not found on retry, attempting to create:", BUCKET_NAME)
    const { error: bucketError } = await admin.storage.createBucket(BUCKET_NAME, {
      public: false,
    })
    if (bucketError && bucketError.status !== 409) {
      console.error("Failed to create bucket:", bucketError)
      return NextResponse.json(
        { error: `Unable to create storage bucket: ${bucketError.message}` },
        { status: 500 },
      )
    }
    console.log("Bucket created/verified, retrying upload")
    uploadResult = await uploadFile()
  }

  if (uploadResult.error) {
    console.error("Upload failed:", uploadResult.error)
    return NextResponse.json(
      { error: `Upload failed: ${uploadResult.error.message}` },
      { status: 500 },
    )
  }

  return NextResponse.json({ path: objectPath, fileName })
}
