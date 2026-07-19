import "dotenv/config";
import { initiateUserControlledWalletsClient } from "@circle-fin/user-controlled-wallets";

const client = initiateUserControlledWalletsClient({ apiKey: process.env.CIRCLE_API_KEY });

async function run() {
  try {
    const res = await client.listTransactions({});
    const txs = res.data?.transactions ?? [];
    const failedTxs = txs.filter(tx => tx.state === "FAILED");
    console.log(`Found ${failedTxs.length} failed transactions.`);
    for (const tx of failedTxs.slice(0, 3)) {
      console.log("Tx ID:", tx.id);
      console.log("Error:", tx.errorReason);
      console.log("Error details:", tx.errorDetails);
      console.log("Blockchain error:", tx.blockchainError);
      console.log("Destination:", tx.destinationAddress);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
