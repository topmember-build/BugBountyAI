import { createAdminClient } from "./admin"

const BUCKET_NAME = "audit-archives"

/**
 * Ensure the audit-archives storage bucket exists.
 * This should be called once during app initialization.
 */
export async function ensureStorageBucket() {
  try {
    const admin = createAdminClient()

    // Try to get the bucket - if it exists, we're done
    const { data: buckets, error: listError } = await admin.storage.listBuckets()

    if (listError) {
      console.warn("Could not list storage buckets:", listError.message)
      return false
    }

    const bucketExists = buckets?.some((b) => b.name === BUCKET_NAME)

    if (bucketExists) {
      console.log(`Storage bucket '${BUCKET_NAME}' already exists`)
      return true
    }

    // Create the bucket if it doesn't exist
    console.log(`Creating storage bucket '${BUCKET_NAME}'...`)
    const { error: createError } = await admin.storage.createBucket(BUCKET_NAME, {
      public: false,
    })

    if (createError) {
      console.error(`Failed to create bucket '${BUCKET_NAME}':`, createError.message)
      return false
    }

    console.log(`Successfully created storage bucket '${BUCKET_NAME}'`)
    return true
  } catch (err) {
    console.error("Error initializing storage bucket:", err)
    return false
  }
}
