const { TableClient } = require("@azure/data-tables");
const { v4: uuidv4 } = require("uuid");

function getEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// Table Storage: super cheap + AZ-104 relevant
function getTableClient() {
  const conn = getEnv("STORAGE_CONNECTION_STRING");
  const tableName = getEnv("TABLE_NOTES_NAME");
  return TableClient.fromConnectionString(conn, tableName);
}

module.exports = async function (context, req) {
  const table = getTableClient();
  const method = (req.method || "GET").toUpperCase();

  // Ensure table exists (safe to call repeatedly)
  await table.createTable();

  if (method === "GET") {
    const campaignId = (req.query.campaignId || "").trim();
    if (!campaignId) {
      context.res = { status: 400, jsonBody: { error: "campaignId is required" } };
      return;
    }

    const notes = [];
    const filter = `PartitionKey eq '${campaignId.replace(/'/g, "''")}'`;

    for await (const entity of table.listEntities({ queryOptions: { filter } })) {
      notes.push({
        id: entity.rowKey,
        campaignId: entity.partitionKey,
        author: entity.author,
        text: entity.text,
        createdAt: entity.createdAt
      });
    }

    notes.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    context.res = { status: 200, jsonBody: { campaignId, notes } };
    return;
  }

  if (method === "POST") {
    const { campaignId, author, text } = req.body || {};
    if (!campaignId || !author || !text) {
      context.res = { status: 400, jsonBody: { error: "campaignId, author, text are required" } };
      return;
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await table.createEntity({
      partitionKey: campaignId,
      rowKey: id,
      author,
      text,
      createdAt: now
    });

    context.res = { status: 201, jsonBody: { ok: true, id, createdAt: now } };
    return;
  }

  context.res = { status: 405, jsonBody: { error: "Method not allowed" } };
};