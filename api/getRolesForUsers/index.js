function getClientPrincipal(req) {
    const header = req.headers?.["x-ms-client-principal"];
    if (!header) return null;
    const decoded = Buffer.from(header, "base64").toString("utf8");
    return JSON.parse(decoded);
}

module.exports = async function (context, req) {
    const principal = getClientPrincipal(req);

    // Must be logged in
    if (!principal?.userDetails) {
        context.res = { status: 200, body: { roles: ["anonymous"] } };
        return;
    }

    // ✅ REAL ROLE SOURCE (Entra App Roles) is ideal, but SWA role API expects us to return roles.
    // We'll map based on Entra user assignment using userDetails as a stable identifier.
    // (After this is working, we can switch to using Entra appRole claims directly if present.)
    const email = principal.userDetails.toLowerCase();

    const roles = ["authenticated"];
    if (email.startsWith("vtm-storyteller@")) roles.push("Storyteller");
    if (email.startsWith("vtm-player@")) roles.push("Player");

    context.res = { status: 200, body: { roles } };
};