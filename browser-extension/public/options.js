const input = document.getElementById("api-base");
const status = document.getElementById("status");

if (
  !(input instanceof HTMLInputElement) ||
  !(status instanceof HTMLElement)
) {
  throw new Error("Settings page is missing required elements.");
}

chrome.storage.sync.get("apiBase").then(({ apiBase }) => {
  input.value =
    typeof apiBase === "string" && apiBase.length > 0
      ? apiBase
      : "http://localhost:3000";
});

document.getElementById("save")?.addEventListener("click", async () => {
  const apiBase = input.value.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(apiBase)) {
    status.textContent =
      "Enter a full address starting with http:// or https://";
    return;
  }
  await chrome.storage.sync.set({ apiBase });
  status.textContent = "Saved.";
});
