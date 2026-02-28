const apiBase = "/api"; // works with Static Web Apps routing later

async function refresh() {
  const campaignId = document.querySelector("#campaignId").value.trim();
  const res = await fetch(`${apiBase}/notes?campaignId=${encodeURIComponent(campaignId)}`);
  const data = await res.json();
  document.querySelector("#out").textContent = JSON.stringify(data, null, 2);
}

async function addNote() {
  const campaignId = document.querySelector("#campaignId").value.trim();
  const author = document.querySelector("#author").value.trim();
  const text = document.querySelector("#text").value.trim();

  const res = await fetch(`${apiBase}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ campaignId, author, text })
  });

  const data = await res.json();
  document.querySelector("#text").value = "";
  await refresh();
  return data;
}

document.querySelector("#refresh").addEventListener("click", refresh);
document.querySelector("#add").addEventListener("click", addNote);

refresh();