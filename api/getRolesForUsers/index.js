function getClientPrincipal(req) {
    const header = req.headers?.["x-ms-client-principal"];
    if (!header) return null;

    try {
        const decoded = Buffer.from(header, "base64").toString("utf8");
        return JSON.parse(decoded);
    } catch {
        return null;
    }
}

module.exports = async function (context, req) {
    const principal = getClientPrincipal(req);

    // Not logged in
    if (!principal?.userDetails) {
        context.res = { status: 200, body: { roles: ["anonymous"] } };
        return;
    }

    const email = principal.userDetails.toLowerCase();

    // Start with authenticated
    const roles = ["authenticated"];

    // Hard-map your two test accounts (we'll swap to Entra app roles later)
    if (email === "vtm-storyteller@dannyirahetaoutlook.onmicrosoft.com") roles.push("Storyteller");
    if (email === "vtm-player@dannyirahetaoutlook.onmicrosoft.com") roles.push("Player");

    context.res = { status: 200, body: { roles } };
};
