const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (raw) {
  const db = new URL(raw);
  console.log("DB host:", db.hostname);
  console.log("DB port:", db.port);
  console.log("DB name:", db.pathname.slice(1));
  console.log("DB user:", db.username);
}