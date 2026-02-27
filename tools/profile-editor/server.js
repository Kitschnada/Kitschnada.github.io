const fs = require("fs");
const path = require("path");
const http = require("http");
const url = require("url");

const ROOT = path.resolve(__dirname, "..", "..");
const CONFIG_PATH = path.join(ROOT, "_config.yml");
const PUBLIC_DIR = path.join(__dirname, "public");
const BACKUP_DIR = path.join(ROOT, ".profile-editor-backups");
const PORT = Number(process.env.PROFILE_EDITOR_PORT || 4100);

const ROOT_FIELDS = ["title", "name", "description", "url", "baseurl", "locale"];
const AUTHOR_FIELDS = [
  "avatar",
  "name",
  "bio",
  "location",
  "employer",
  "uri",
  "email",
  "googlescholar",
  "orcid",
  "github",
  "linkedin",
  "researchgate",
  "semantic"
];

function readConfig() {
  return fs.readFileSync(CONFIG_PATH, "utf8");
}

function splitValueAndComment(raw) {
  let inSingle = false;
  let inDouble = false;
  let escaped = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === "\\") {
      escaped = inDouble;
      continue;
    }

    if (!inDouble && ch === "'") {
      inSingle = !inSingle;
      continue;
    }

    if (!inSingle && ch === '"') {
      inDouble = !inDouble;
      continue;
    }

    if (!inSingle && !inDouble && ch === "#") {
      return {
        value: raw.slice(0, i).trim(),
        comment: raw.slice(i).trim()
      };
    }
  }

  return {
    value: raw.trim(),
    comment: ""
  };
}

function decodeYamlScalar(value) {
  if (!value) {
    return "";
  }

  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return value.slice(1, -1);
    }
  }

  if (value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }

  return value;
}

function encodeYamlScalar(value) {
  const normalized = typeof value === "string" ? value.trim() : String(value || "").trim();

  if (normalized === "") {
    return "";
  }

  return JSON.stringify(normalized);
}

function parseProfile(content) {
  const lines = content.split(/\r?\n/);
  const profile = {
    root: {},
    author: {}
  };

  let inAuthor = false;

  for (const line of lines) {
    if (/^author\s*:\s*$/.test(line)) {
      inAuthor = true;
      continue;
    }

    if (inAuthor && /^\S/.test(line) && !/^author\s*:/.test(line)) {
      inAuthor = false;
    }

    if (!inAuthor) {
      const rootMatch = line.match(/^([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
      if (!rootMatch) {
        continue;
      }

      const key = rootMatch[1];
      if (!ROOT_FIELDS.includes(key)) {
        continue;
      }

      const parsed = splitValueAndComment(rootMatch[2]);
      profile.root[key] = decodeYamlScalar(parsed.value);
      continue;
    }

    const authorMatch = line.match(/^\s{2}([a-zA-Z0-9_-]+)\s*:\s*(.*)$/);
    if (!authorMatch) {
      continue;
    }

    const key = authorMatch[1];
    if (!AUTHOR_FIELDS.includes(key)) {
      continue;
    }

    const parsed = splitValueAndComment(authorMatch[2]);
    profile.author[key] = decodeYamlScalar(parsed.value);
  }

  for (const key of ROOT_FIELDS) {
    if (typeof profile.root[key] !== "string") {
      profile.root[key] = "";
    }
  }

  for (const key of AUTHOR_FIELDS) {
    if (typeof profile.author[key] !== "string") {
      profile.author[key] = "";
    }
  }

  return profile;
}

function updateKeyInLines(lines, key, newValue, inAuthor) {
  const encoded = encodeYamlScalar(newValue);
  const keyPattern = inAuthor
    ? new RegExp(`^(\\s{2}${key}\\s*:\\s*)(.*)$`)
    : new RegExp(`^(${key}\\s*:\\s*)(.*)$`);

  let replaced = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(keyPattern);

    if (!match) {
      continue;
    }

    const parsed = splitValueAndComment(match[2]);
    const comment = parsed.comment;
    const prefix = match[1];

    if (encoded && comment) {
      lines[i] = `${prefix}${encoded} ${comment}`;
    } else if (encoded) {
      lines[i] = `${prefix}${encoded}`;
    } else if (comment) {
      lines[i] = `${prefix}${comment}`;
    } else {
      lines[i] = `${prefix}`;
    }

    replaced = true;
    break;
  }

  return replaced;
}

function updateProfile(content, nextProfile) {
  const lines = content.split(/\r?\n/);

  for (const key of ROOT_FIELDS) {
    updateKeyInLines(lines, key, nextProfile.root[key], false);
  }

  const authorStart = lines.findIndex((line) => /^author\s*:\s*$/.test(line));
  if (authorStart >= 0) {
    let authorEnd = lines.length;
    for (let i = authorStart + 1; i < lines.length; i += 1) {
      if (/^\S/.test(lines[i])) {
        authorEnd = i;
        break;
      }
    }

    const authorLines = lines.slice(authorStart + 1, authorEnd);
    for (const key of AUTHOR_FIELDS) {
      updateKeyInLines(authorLines, key, nextProfile.author[key], true);
    }

    lines.splice(authorStart + 1, authorEnd - authorStart - 1, ...authorLines);
  }

  return `${lines.join("\n")}\n`;
}

function backupConfig(content) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(BACKUP_DIR, `_config-${stamp}.yml`);
  fs.writeFileSync(backupPath, content, "utf8");
  return backupPath;
}

function sendJson(res, statusCode, payload) {
  const json = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json)
  });
  res.end(json);
}

function serveStatic(req, res, pathname) {
  const target = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, target);
  const normalized = path.normalize(filePath);

  if (!normalized.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(normalized, (error, data) => {
    if (error) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const ext = path.extname(normalized).toLowerCase();
    const typeMap = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8"
    };

    res.writeHead(200, {
      "Content-Type": typeMap[ext] || "application/octet-stream",
      "Content-Length": data.length
    });
    res.end(data);
  });
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname || "/";

    if (pathname === "/api/profile" && req.method === "GET") {
      try {
        const content = readConfig();
        const profile = parseProfile(content);
        sendJson(res, 200, { profile });
      } catch (error) {
        sendJson(res, 500, { error: error.message });
      }
      return;
    }

    if (pathname === "/api/profile" && req.method === "POST") {
      try {
        const body = await parseBody(req);
        const next = {
          root: body.root || {},
          author: body.author || {}
        };

        const currentContent = readConfig();
        const currentProfile = parseProfile(currentContent);

        for (const key of ROOT_FIELDS) {
          if (typeof next.root[key] !== "string") {
            next.root[key] = currentProfile.root[key] || "";
          }
        }

        for (const key of AUTHOR_FIELDS) {
          if (typeof next.author[key] !== "string") {
            next.author[key] = currentProfile.author[key] || "";
          }
        }

        const updated = updateProfile(currentContent, next);
        const backupPath = backupConfig(currentContent);
        fs.writeFileSync(CONFIG_PATH, updated, "utf8");

        sendJson(res, 200, {
          ok: true,
          message: "Saved _config.yml successfully.",
          backupPath,
          profile: parseProfile(updated)
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message });
      }
      return;
    }

    serveStatic(req, res, pathname);
  });
}

function startServer() {
  const server = createServer();

  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Profile editor running at http://127.0.0.1:${PORT}`);
    console.log("Edit values and click Save. Then restart jekyll serve to apply config changes.");
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  parseProfile,
  updateProfile,
  splitValueAndComment,
  decodeYamlScalar,
  encodeYamlScalar,
  createServer,
  startServer
};
