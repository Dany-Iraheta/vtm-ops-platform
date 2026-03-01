function getClientPrincipal(req) {
    const header = req.headers?.["x-ms-client-principal"];
    if (!header) return null;
    try {
        const decoded = Buffer.from(header, "base64").toString("utf8");
        return JSON.parse(decoded);
    } catch (e) {
        return { parseError: e.message, raw: header };
    }
}

module.exports = async function (context, req) {
    const principal = getClientPrincipal(req);

    context.res = {
        status: 200,
        body: {
            hasPrincipalHeader: !!req.headers?.["x-ms-client-principal"],
            headersHas: Object.keys(req.headers || {}).filter(h =>
                h.startsWith("x-ms") || h.startsWith("cookie") || h.startsWith("authorization")
            ),
            principal
        }
    };
};