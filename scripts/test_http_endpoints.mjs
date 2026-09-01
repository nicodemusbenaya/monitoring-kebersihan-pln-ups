async function testEndpoints() {
  console.log("Menguji HTTP endpoint server lokal...");

  const endpoints = [
    "http://localhost:3000",
    "http://localhost:3000/login",
    "http://localhost:3000/scanner",
    "http://localhost:3000/api/evaluations",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      console.log(`URL: ${url} -> Status: ${res.status}`);
      if (res.status === 500) {
        const text = await res.text();
        console.error("Detail 500 Error:", text.slice(0, 300));
      }
    } catch (e) {
      console.error(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

testEndpoints().catch(console.error);
