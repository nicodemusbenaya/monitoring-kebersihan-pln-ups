async function getErrorDetails() {
  const res = await fetch("http://localhost:3000/login");
  const html = await res.text();
  console.log("HTML response length:", html.length);
  // look for error text or stack trace
  const match = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i) || html.match(/Error:[\s\S]{1,500}/i);
  if (match) {
    console.log("Error Snippet:", match[0]);
  } else {
    console.log("Raw HTML snippet:", html.slice(0, 1000));
  }
}

getErrorDetails().catch(console.error);
