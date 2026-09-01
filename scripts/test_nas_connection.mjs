async function testNas() {
  const endpoint = "http://nasups01.myqnapcloud.com:18080";
  const token = "UPS_EARSIP_2026_4F8A9C2D7E5B1F6A8D3E9C4B7F2A6D1E8C5B9A7D";

  console.log(`Menguji koneksi ke NAS di: ${endpoint}`);

  try {
    const healthRes = await fetch(`${endpoint}/health`, { signal: AbortSignal.timeout(5000) });
    const healthData = await healthRes.json();
    console.log("Status /health:", healthRes.status, healthData);
  } catch (e) {
    console.log("Gagal akses /health:", e.message);
  }

  try {
    const statusRes = await fetch(`${endpoint}/api/kebersihan/status`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    });
    const statusData = await statusRes.json();
    console.log("Status /api/kebersihan/status:", statusRes.status, statusData);
  } catch (e) {
    console.log("Gagal akses /api/kebersihan/status:", e.message);
  }
}

testNas().catch(console.error);
