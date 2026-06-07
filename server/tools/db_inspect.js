import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config({ path: new URL("../.env", import.meta.url) });

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nexthire";
const sampleLimit = parseInt(process.argv[2] || "5", 10);

async function main() {
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
  });
  await client.connect();
  const admin = client.db().admin();
  const dbs = await admin.listDatabases();

  for (const dbInfo of dbs.databases) {
    const db = client.db(dbInfo.name);
    const collections = await db.collections();
    console.log(`\nDatabase: ${dbInfo.name}`);
    for (const col of collections) {
      const count = await col.countDocuments();
      console.log(`- Collection: ${col.collectionName} (count: ${count})`);
      const docs = await col.find({}).limit(sampleLimit).toArray();
      docs.forEach((doc, idx) => {
        console.log(`  [${idx + 1}] ${JSON.stringify(doc)}`);
      });
    }
  }

  await client.close();
}

main().catch((err) => {
  console.error("DB inspect failed:", err.message);
  process.exit(1);
});
