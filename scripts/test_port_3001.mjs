async function testPort3001() {
  console.log("Menguji HTTP endpoint server port 3001...");

  const endpoints = [
    "http://localhost:3001/login",
    "http://localhost:3001/scanner",
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      console.log(`URL: ${url} -> Status: ${res.status}`);
    } catch (e) {
      console.error(`URL: ${url} -> Error: ${e.message}`);
    }
  }
}

testPort3001().catch(console.error);
