function getClientPrincipal(req) {
    const header = req.headers?.["x-ms-client-principal"];
    if (!header) return null;
    const decoded = Buffer.from(header, "base64").toString("utf8");
    return JSON.parse(decoded);
}

module.exports = async function (context, req) {
    const principal = getClientPrincipal(req);
    if (!principal?.userRoles?.includes("authenticated")) {
        context.res = { status: 401, body: { error: "Login required" } };
        return;
    }

    context.res = {
        status: 200,
        body: {
            user: principal.userDetails,
            roles: principal.userRoles
        }
    };
};

