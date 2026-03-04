const apiBase = import.meta.env.VITE_API_BASE || "/api"; // SWA default, or external Function App
const loginUrl = "/.auth/login/aad";
const logoutUrl = "/.auth/logout?post_logout_redirect_uri=/";

async function fetchJson(url, options) {
  const res = await fetch(url, options);

  // if the API returns HTML or empty, this prevents "Unexpected end of JSON input"
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

async function refresh() {
  const campaignId = document.querySelector("#campaignId").value.trim();
  const data = await fetchJson(`${apiBase}/notes?campaignId=${encodeURIComponent(campaignId)}`);
  document.querySelector("#out").textContent = JSON.stringify(data, null, 2);
}

async function addNote() {
  const campaignId = document.querySelector("#campaignId").value.trim();
  const author = document.querySelector("#author").value.trim();
  const text = document.querySelector("#text").value.trim();

  const data = await fetchJson(`${apiBase}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId, author, text })
  });

  document.querySelector("#text").value = "";
  await refresh();
  return data;
}

window.vtmAuth = { loginUrl, logoutUrl };

document.querySelector("#refresh").addEventListener("click", refresh);
document.querySelector("#add").addEventListener("click", addNote);

refresh().catch(err => {
  document.querySelector("#out").textContent = String(err);
});