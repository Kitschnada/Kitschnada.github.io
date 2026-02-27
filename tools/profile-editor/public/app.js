const statusEl = document.getElementById("status");
const saveBtn = document.getElementById("saveBtn");
const reloadBtn = document.getElementById("reloadBtn");
const inputs = Array.from(document.querySelectorAll("input[data-path]"));
const previews = Array.from(document.querySelectorAll("[data-preview]"));

function getByPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : ""), obj);
}

function setByPath(obj, path, value) {
  const parts = path.split(".");
  let cursor = obj;

  for (let i = 0; i < parts.length - 1; i += 1) {
    const key = parts[i];
    if (!cursor[key]) {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
}

function renderPreview() {
  const model = { root: {}, author: {} };

  for (const input of inputs) {
    setByPath(model, input.dataset.path, input.value);
  }

  for (const preview of previews) {
    preview.textContent = getByPath(model, preview.dataset.preview) || "-";
  }
}

function setStatus(text, type) {
  statusEl.textContent = text;
  statusEl.className = "status" + (type ? ` ${type}` : "");
}

async function loadProfile() {
  setStatus("正在读取配置...", "");
  const response = await fetch("/api/profile");
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "读取失败");
  }

  for (const input of inputs) {
    input.value = getByPath(data.profile, input.dataset.path) || "";
  }

  renderPreview();
  setStatus("配置读取成功", "ok");
}

async function saveProfile() {
  const profile = { root: {}, author: {} };

  for (const input of inputs) {
    setByPath(profile, input.dataset.path, input.value);
  }

  setStatus("正在保存...", "");
  saveBtn.disabled = true;

  const response = await fetch("/api/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile)
  });

  const data = await response.json();
  saveBtn.disabled = false;

  if (!response.ok) {
    throw new Error(data.error || "保存失败");
  }

  setStatus(`保存成功，备份：${data.backupPath}`, "ok");
}

for (const input of inputs) {
  input.addEventListener("input", renderPreview);
}

reloadBtn.addEventListener("click", () => {
  loadProfile().catch((error) => setStatus(error.message, "err"));
});

saveBtn.addEventListener("click", () => {
  saveProfile().catch((error) => {
    saveBtn.disabled = false;
    setStatus(error.message, "err");
  });
});

loadProfile().catch((error) => setStatus(error.message, "err"));
