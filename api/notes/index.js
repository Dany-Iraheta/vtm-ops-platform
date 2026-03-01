const { TableClient } = require("@azure/data-tables");
const { v4: uuidv4 } = require("uuid");

function getClientPrincipal(req) {
    const header =
        (req.headers && (req.headers["x-ms-client-principal"] || req.headers["X-MS-CLIENT-PRINCIPAL"])) ||
        null;
    if (!header) return null;

    const decoded = Buffer.from(header, "base64").toString("utf8");
    return JSON.parse(decoded);
}

function isAuthenticated(principal) {
    if (!principal?.userRoles) return false;
    // SWA includes these automatically; "anonymous" means not logged in
    return principal.userRoles.includes("authenticated") && !principal.userRoles.includes("anonymous");
}

function hasRole(principal, role) {
    return Array.isArray(principal?.userRoles) && principal.userRoles.includes(role);
}
function getEnv(name) {
    const v = process.env[name];
    if (!v) throw new Error(`Missing env var: ${name}`);
    return v;
}

function getTableClient() {
    const conn = getEnv("STORAGE_CONNECTION_STRING");
    const tableName = getEnv("TABLE_NOTES_NAME");
    return TableClient.fromConnectionString(conn, tableName);
}

module.exports = async function (context, req) {
    try {
        const table = getTableClient();
        await table.createTable();

        const method = (req.method || "GET").toUpperCase();

        const principal = getClientPrincipal(req);

        if (!principal || !isAuthenticated(principal)) {
            context.res = { status: 401, body: { error: "Login required" } };
            return;
        }

        if (method === "POST" && !hasRole(principal, "Storyteller")) {
            context.res = { status: 403, body: { error: "Storyteller role required" } };
            return;
        }

        if (method === "GET") {
            const campaignId = (req.query.campaignId || "").trim();
            if (!campaignId) {
                context.res = { status: 400, body: { error: "campaignId is required" } };
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
            context.res = { status: 200, body: { campaignId, notes } };
            return;
        }

        if (method === "POST") {
            const { campaignId, author, text } = req.body || {};
            if (!campaignId || !author || !text) {
                context.res = { status: 400, body: { error: "campaignId, author, text are required" } };
                return;
            }

            const id = uuidv4();
            const now = new Date().toISOString();

            await table.createEntity({
                const principal = getClientPrincipal(req);

                if(!principal?.userRoles?.includes("authenticated")) {
                context.res = { status: 401, body: { error: "Login required" } };
                return;
            }

            if (method === "POST" && !principal.userRoles.includes("Storyteller")) {
                context.res = { status: 403, body: { error: "Storyteller role required", roles: principal.userRoles } };
                return;
            }                rowKey: id,
                author,
                text,
                createdAt: now
            });

            context.res = { status: 201, body: { ok: true, id, createdAt: now } };
            return;
        }

        context.res = { status: 405, body: { error: "Method not allowed" } };
    } catch (err) {
        context.log.error(err);
        context.res = { status: 500, body: { error: err.message || "Internal error" } };
    }
};