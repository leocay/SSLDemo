const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");
const tls = require("node:tls");
const { URLSearchParams } = require("node:url");

const HTTP_PORT = 5080;
const HTTPS_PORT = 5443;
const CERT_PATH = path.join(__dirname, "certs", "localhost-demo.pfx");
const CERT_PASSPHRASE = "localhost-demo";

if (!fs.existsSync(CERT_PATH)) {
  console.error(`Missing certificate: ${CERT_PATH}`);
  console.error("Run: dotnet dev-certs https -ep .\\LocalHttpHttpsDemo\\certs\\localhost-demo.pfx -p localhost-demo");
  process.exit(1);
}

const tlsOptions = {
  pfx: fs.readFileSync(CERT_PATH),
  passphrase: CERT_PASSPHRASE,
};
const secureContext = tls.createSecureContext(tlsOptions);

const httpServer = http.createServer(handleRequest);
const httpsHttpServer = http.createServer(handleRequest);
const httpsPortServer = net.createServer(handleHttpsPortConnection);

function handleHttpsPortConnection(socket) {
  socket.once("data", (chunk) => {
    const firstBytes = chunk.toString("ascii", 0, Math.min(chunk.length, 8)).toUpperCase();
    const isHttpRequest =
      firstBytes.startsWith("GET ") ||
      firstBytes.startsWith("POST ") ||
      firstBytes.startsWith("HEAD ") ||
      firstBytes.startsWith("PUT ") ||
      firstBytes.startsWith("OPTIONS ");

    if (isHttpRequest) {
      socket.end(
        "HTTP/1.1 301 Moved Permanently\r\n" +
          `Location: https://localhost:${HTTPS_PORT}/login\r\n` +
          "Connection: close\r\n" +
          "Content-Length: 0\r\n" +
          "\r\n"
      );
      return;
    }

    socket.pause();
    socket.unshift(chunk);
    const tlsSocket = new tls.TLSSocket(socket, {
      isServer: true,
      secureContext,
    });

    tlsSocket.once("secure", () => {
      httpsHttpServer.emit("connection", tlsSocket);
      tlsSocket.resume();
    });

    tlsSocket.on("error", () => {
      tlsSocket.destroy();
    });

    tlsSocket.resume();
  });

  socket.on("error", () => {
    socket.destroy();
  });
}

httpServer.listen(HTTP_PORT, "localhost", () => {
  console.log(`HTTP  listening on http://localhost:${HTTP_PORT}/login`);
});

httpsPortServer.listen(HTTPS_PORT, "localhost", () => {
  console.log(`HTTPS listening on https://localhost:${HTTPS_PORT}/login`);
});

function handleRequest(req, res) {
  const requestUrl = new URL(req.url, `${req.socket.encrypted ? "https" : "http"}://${req.headers.host}`);

  if (requestUrl.pathname === "/") {
    redirect(res, "/login");
    return;
  }

  if (requestUrl.pathname === "/health") {
    json(res, {
      status: "running",
      http: `http://localhost:${HTTP_PORT}/login`,
      https: `https://localhost:${HTTPS_PORT}/login`,
    });
    return;
  }

  if (requestUrl.pathname !== "/login") {
    notFound(res);
    return;
  }

  if (req.method === "GET") {
    html(res, renderLoginPage(pageInfo(req)));
    return;
  }

  if (req.method === "POST") {
    readBody(req, (body) => {
      const form = new URLSearchParams(body);
      const submission = {
        username: form.get("username") || "",
        password: form.get("password") || "",
        note: form.get("note") || "",
        submittedAt: new Date(),
      };

      console.log(
        `[${submission.submittedAt.toLocaleTimeString()}] ${pageInfo(req).scheme.toUpperCase()} form received: ` +
          `username=${submission.username}; password=${submission.password}; note=${submission.note}`
      );

      html(res, renderResultPage(pageInfo(req), submission));
    });
    return;
  }

  res.writeHead(405, { Allow: "GET, POST" });
  res.end("Method not allowed");
}

function pageInfo(req) {
  const scheme = req.socket.encrypted ? "https" : "http";
  const port = scheme === "https" ? HTTPS_PORT : HTTP_PORT;

  return {
    scheme,
    port,
    displayUrl: `${scheme}://localhost:${port}/login`,
    transportText: scheme === "https" ? "Encrypted with TLS on the network" : "Clear text on the network",
  };
}

function readBody(req, callback) {
  let body = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => callback(body));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location, "Cache-Control": "no-store" });
  res.end();
}

function json(res, value) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}

function html(res, value) {
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(value);
}

function notFound(res) {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
}

function renderLoginPage(page) {
  const scheme = escapeHtml(page.scheme.toUpperCase());

  return layout(
    "Local HTTP HTTPS Demo",
    `
    <main class="shell">
      <section class="panel">
        <div class="protocol-band ${escapeHtml(page.scheme)}">
          <span>${scheme}</span>
          <strong>${escapeHtml(page.transportText)}</strong>
        </div>

        <form class="login" method="post" action="/login" autocomplete="off">
          <header>
            <p class="eyebrow">localhost form demo</p>
            <h1>Dang nhap thu nghiem</h1>
          </header>

          <label>
            Ten dang nhap
            <input name="username" value="linh" required>
          </label>

          <label>
            Mat khau
            <input name="password" type="password" value="123456" required>
          </label>

          <label>
            Ghi chu
            <textarea name="note" rows="3">Demo gui form qua ${scheme}</textarea>
          </label>

          <button type="submit">Gui form</button>
        </form>
      </section>
    </main>
    `
  );
}

function renderResultPage(page, submission) {
  return layout(
    "Server received form",
    `
    <main class="shell">
      <section class="panel result">
        <div class="protocol-band ${escapeHtml(page.scheme)}">
          <span>${escapeHtml(page.scheme.toUpperCase())}</span>
          <strong>${escapeHtml(page.transportText)}</strong>
        </div>

        <header>
          <p class="eyebrow">${escapeHtml(submission.submittedAt.toLocaleTimeString())}</p>
          <h1>Server da nhan form</h1>
        </header>

        <dl class="received">
          <div>
            <dt>username</dt>
            <dd>${escapeHtml(submission.username)}</dd>
          </div>
          <div>
            <dt>password</dt>
            <dd>${escapeHtml(submission.password)}</dd>
          </div>
          <div>
            <dt>note</dt>
            <dd>${escapeHtml(submission.note)}</dd>
          </div>
        </dl>

        <a class="button-link" href="/login">Gui lai</a>
      </section>
    </main>
    `
  );
}

function layout(title, body) {
  return `<!doctype html>
  <html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1d2433;
        --muted: #667085;
        --line: #d8dee8;
        --paper: #ffffff;
        --wash: #f4f7fb;
        --accent: #1f7a8c;
        --shadow: 0 18px 45px rgba(30, 41, 59, .14);
      }

      * { box-sizing: border-box; }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background:
          linear-gradient(90deg, rgba(31, 122, 140, .08) 1px, transparent 1px),
          linear-gradient(rgba(31, 122, 140, .08) 1px, transparent 1px),
          var(--wash);
        background-size: 34px 34px;
        color: var(--ink);
        font-family: Segoe UI, Arial, sans-serif;
      }

      .shell {
        width: min(700px, calc(100vw - 32px));
      }

      .panel {
        background: var(--paper);
        border: 1px solid var(--line);
        border-radius: 8px;
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .protocol-band {
        min-height: 88px;
        padding: 18px 22px;
        display: flex;
        align-items: end;
        justify-content: space-between;
        color: white;
      }

      .protocol-band.http { background: linear-gradient(135deg, #b42318, #e06f2f); }
      .protocol-band.https { background: linear-gradient(135deg, #177245, #1f7a8c); }

      .protocol-band span {
        font-size: clamp(2.2rem, 5vw, 4rem);
        line-height: 1;
        font-weight: 800;
        letter-spacing: 0;
      }

      .protocol-band strong {
        max-width: 260px;
        text-align: right;
        font-size: 1rem;
        line-height: 1.35;
      }

      .login, .result { padding: 28px; }
      header { margin-bottom: 22px; }

      .eyebrow {
        margin: 0 0 6px;
        color: var(--accent);
        font-size: .78rem;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: 2rem;
        line-height: 1.15;
        letter-spacing: 0;
      }

      label {
        display: grid;
        gap: 8px;
        margin-top: 16px;
        color: #344054;
        font-size: .95rem;
        font-weight: 650;
      }

      input, textarea {
        width: 100%;
        border: 1px solid #b7c0cf;
        border-radius: 6px;
        padding: 12px 13px;
        color: var(--ink);
        font: inherit;
        resize: vertical;
        background: white;
      }

      input:focus, textarea:focus {
        outline: 3px solid rgba(31, 122, 140, .22);
        border-color: var(--accent);
      }

      button, .button-link {
        display: inline-flex;
        min-height: 44px;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        text-decoration: none;
        font: inherit;
        font-weight: 750;
        cursor: pointer;
      }

      button, .button-link {
        margin-top: 22px;
        border: 0;
        padding: 0 18px;
        color: white;
        background: var(--accent);
      }

      dl { margin: 0; display: grid; gap: 14px; }
      dl div { border-bottom: 1px solid var(--line); padding-bottom: 13px; }

      dt {
        color: var(--muted);
        font-size: .78rem;
        font-weight: 700;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      dd {
        margin: 5px 0 0;
        overflow-wrap: anywhere;
        font-weight: 700;
      }

      .received { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .received div {
        min-height: 92px;
        padding: 14px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: #f9fbfe;
      }

      @media (max-width: 760px) {
        body { place-items: start center; padding: 16px 0; }
        .protocol-band { min-height: 110px; display: grid; align-items: end; gap: 8px; }
        .protocol-band strong { text-align: left; }
        .received { grid-template-columns: 1fr; }
      }
    </style>
  </head>
  <body>${body}</body>
  </html>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
