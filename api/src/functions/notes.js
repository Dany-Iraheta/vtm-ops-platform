const { app } = require("@azure/functions");
const { TableClient } = require("@azure/data-tables");
const { v4: uuidv4 } = require("uuid");

function mustGet(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getTableClient() {
  const conn = mustGet("STORAGE_CONNECTION_STRING");
  const tableName = mustGet("TABLE_NOTES_NAME");
  return TableClient.fromConnectionString(conn, tableName);
}

app.http("notes", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "notes",
  handler: async (request, context) => {
    try {
      const table = getTableClient();
      await table.createTable();

      if (request.method === "GET") {
        const url = new URL(request.url);
        const campaignId = (url.searchParams.get("campaignId") || "").trim();

        if (!campaignId) {
          return {
            status: 400,
            jsonBody: { error: "campaignId is required" }
          };
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
        return { status: 200, jsonBody: { campaignId, notes } };
      }

      // POST
      const body = await request.json();
      const campaignId = (body.campaignId || "").trim();
      const author = (body.author || "").trim();
      const text = (body.text || "").trim();

      if (!campaignId || !author || !text) {
        return {
          status: 400,
          jsonBody: { error: "campaignId, author, text are required" }
        };
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

      return { status: 201, jsonBody: { ok: true, id, createdAt: now } };
    } catch (err) {
      context.error(err);
      return { status: 500, jsonBody: { error: err.message || "Internal error" } };
    }
  }
});