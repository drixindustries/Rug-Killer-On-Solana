// Raw HTTP test for Ankr API - bypassing Solana web3.js library
const ANKR_API_KEY = process.env.ANKR_API_KEY || "";
const ANKR_URL = `https://rpc.ankr.com/solana/${ANKR_API_KEY}`;

if (!ANKR_API_KEY) {
  console.error("❌ ANKR_API_KEY not set in environment variables");
  process.exit(1);
}

async function testRawAnkrRequest() {
  console.log("🔍 Testing raw Ankr API request...\n");
  console.log(`📡 URL: ${ANKR_URL.substring(0, 45)}...\n`);

  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "getSlot",
    params: []
  };

  try {
    console.log("⏳ Sending request...");
    const response = await fetch(ANKR_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    console.log(`📊 Headers:`, Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log(`📄 Raw response:\n${text}\n`);

    try {
      const json = JSON.parse(text);
      console.log("✅ Valid JSON response");
      console.log("📦 Parsed:", JSON.stringify(json, null, 2));

      if (json.error) {
        console.error("\n❌ API Error:", json.error);
        if (json.error.message?.includes('origin')) {
          console.error("\n⚠️  CORS/Origin issue detected!");
          console.error("Check your Ankr dashboard whitelist settings.");
        }
      } else if (json.result !== undefined) {
        console.log("\n✅ SUCCESS! Current slot:", json.result);
      }
    } catch (parseErr) {
      console.error("❌ Failed to parse JSON:", parseErr);
    }

  } catch (error: any) {
    console.error("\n❌ Request failed:");
    console.error(error.message);
  }
}

testRawAnkrRequest();
