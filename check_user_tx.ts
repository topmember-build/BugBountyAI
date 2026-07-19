import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY! });

async function run() {
  try {
    const { data: fees } = await supabase
      .from("audit_fees")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (!fees || fees.length === 0) {
      console.log("No audit fees found.");
      return;
    }

    for (const fee of fees) {
      if (!fee.transaction_id) continue;
      console.log(`Checking transaction_id: ${fee.transaction_id} for user ${fee.user_id}`);
      
      // We need userToken. To get it, we need to create a session for the user.
      const res = await client.createUserToken({ userId: fee.user_id });
      const userToken = res.data?.userToken;
      if (!userToken) continue;

      try {
        const txRes = await client.getTransaction({
          userToken,
          id: fee.transaction_id
        });
        const tx = txRes.data?.transaction;
        console.log(`State: ${tx?.state}`);
        if (tx?.state === "FAILED") {
          console.log(`Error Reason: ${tx.errorReason}`);
          console.log(`Error Details: ${tx.errorDetails}`);
          console.log(`Blockchain Error: ${tx.blockchainError}`);
        }
      } catch (txErr) {
        console.error("Failed to get tx details:", txErr);
      }
    }
  } catch (err) {
    console.error(err);
  }
}

run();
