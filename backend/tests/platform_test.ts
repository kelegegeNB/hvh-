import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// Load env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../.env") });

const API_URL = "http://localhost:3001/api";
const ADMIN_KEY = process.env.ADMIN_KEY || "admin_secret"; // Fallback if not loaded

async function test() {
  console.log("Starting Platform Management Integration Test...");

  // 1. Bootstrap/Login Admin
  console.log("1. Authenticating as Admin...");
  let token = "";
  try {
    // Try bootstrap
    const res = await fetch(`${API_URL}/auth/bootstrap-admin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "test_admin", password: "password123", adminKey: ADMIN_KEY })
    });
    if (res.ok) {
      const data = await res.json() as any;
      token = data.token;
      console.log("   Admin created and logged in.");
    } else {
        // Try login
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: "test_admin", password: "password123" })
        });
        if (loginRes.ok) {
            const data = await loginRes.json() as any;
            token = data.token;
            console.log("   Admin logged in.");
        } else {
            console.error("   Failed to auth admin. Check server logs or ADMIN_KEY.");
            return;
        }
    }
  } catch (e) {
    console.error("   Connection failed. Is server running?", e);
    return;
  }

  // 2. Create Platform
  console.log("2. Creating Platform 'TestPlatform'...");
  const platformName = "TestPlatform_" + Date.now();
  let platformId = "";
  
  const createRes = await fetch(`${API_URL}/platforms`, {
    method: "POST",
    headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ name: platformName, icon: "http://example.com/icon.png" })
  });

  if (createRes.ok) {
    const data = await createRes.json() as any;
    platformId = data.id;
    console.log("   Platform created:", data);
  } else {
    console.error("   Failed to create platform:", await createRes.text());
    return;
  }

  // 3. List Platforms (Public)
  console.log("3. Listing Platforms (Public)...");
  const listRes = await fetch(`${API_URL}/platforms`);
  const listData = await listRes.json() as any;
  const found = listData.items.find((p: any) => p.id === platformId);
  if (found) {
    console.log("   Platform found in list.");
  } else {
    console.error("   Platform NOT found in list!");
    return;
  }

  // 4. Delete Platform
  console.log("4. Deleting Platform...");
  const deleteRes = await fetch(`${API_URL}/platforms/${platformId}`, {
    method: "DELETE",
    headers: { "Authorization": `Bearer ${token}` }
  });

  if (deleteRes.ok) {
    console.log("   Platform deleted.");
  } else {
    console.error("   Failed to delete platform:", await deleteRes.text());
    return;
  }

  // 5. Verify Deletion
  console.log("5. Verifying Deletion...");
  const listRes2 = await fetch(`${API_URL}/platforms`);
  const listData2 = await listRes2.json() as any;
  const found2 = listData2.items.find((p: any) => p.id === platformId);
  if (!found2) {
    console.log("   Platform successfully removed.");
    console.log("TEST PASSED ✅");
  } else {
    console.error("   Platform still exists!");
    console.log("TEST FAILED ❌");
  }
}

test();
