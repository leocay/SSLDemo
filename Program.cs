using System.Text.Encodings.Web;

const int HttpPort = 5080;
const int HttpsPort = 5443;
const string HttpsCertPassword = "localhost-demo";

var builder = WebApplication.CreateBuilder(args);
var httpsCertPath = Path.Combine(builder.Environment.ContentRootPath, "certs", "localhost-demo.pfx");

builder.Logging.ClearProviders();
builder.Logging.AddConsole();

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenLocalhost(HttpPort);
    options.ListenLocalhost(HttpsPort, listenOptions =>
    {
        listenOptions.UseHttps(httpsCertPath, HttpsCertPassword);
    });
});

var app = builder.Build();

app.Use(async (context, next) =>
{
    context.Response.Headers.CacheControl = "no-store";
    await next();
});

app.MapGet("/", () => Results.Redirect("/login"));

app.MapGet("/login", (HttpContext context) =>
{
    var page = PageInfo.FromRequest(context.Request);
    return HtmlResult(RenderLoginPage(page));
});

app.MapPost("/login", async (HttpContext context) =>
{
    var form = await context.Request.ReadFormAsync();
    var page = PageInfo.FromRequest(context.Request);
    var submission = new LoginSubmission(
        form["username"].ToString(),
        form["password"].ToString(),
        form["note"].ToString(),
        DateTimeOffset.Now);

    Console.WriteLine(
        "[{0}] {1} login received: username={2}; password={3}; note={4}",
        submission.SubmittedAt.ToString("HH:mm:ss"),
        page.Scheme.ToUpperInvariant(),
        submission.Username,
        submission.Password,
        submission.Note);

    return HtmlResult(RenderResultPage(page, submission));
});

app.MapGet("/health", () => Results.Ok(new
{
    status = "running",
    http = $"http://localhost:{HttpPort}/login",
    https = $"https://localhost:{HttpsPort}/login"
}));

app.Run();

static IResult HtmlResult(string html)
{
    return Results.Content(html, "text/html; charset=utf-8");
}

static string RenderLoginPage(PageInfo page)
{
    var scheme = Html(page.Scheme.ToUpperInvariant());

    return Layout(
        "Local HTTP HTTPS Demo",
        $"""
        <main class="shell">
            <section class="panel">
                <div class="protocol-band {Html(page.Scheme)}">
                    <span>{scheme}</span>
                    <strong>{Html(page.TransportText)}</strong>
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
                        <textarea name="note" rows="3">Demo gui form qua {scheme}</textarea>
                    </label>

                    <button type="submit">Gui form</button>
                </form>
            </section>
        </main>
        """);
}

static string RenderResultPage(PageInfo page, LoginSubmission submission)
{
    return Layout(
        "Server received form",
        $"""
        <main class="shell">
            <section class="panel result">
                <div class="protocol-band {Html(page.Scheme)}">
                    <span>{Html(page.Scheme.ToUpperInvariant())}</span>
                    <strong>{Html(page.TransportText)}</strong>
                </div>

                <header>
                    <p class="eyebrow">{Html(submission.SubmittedAt.ToString("HH:mm:ss zzz"))}</p>
                    <h1>Server da nhan form</h1>
                </header>

                <dl class="received">
                    <div>
                        <dt>username</dt>
                        <dd>{Html(submission.Username)}</dd>
                    </div>
                    <div>
                        <dt>password</dt>
                        <dd>{Html(submission.Password)}</dd>
                    </div>
                    <div>
                        <dt>note</dt>
                        <dd>{Html(submission.Note)}</dd>
                    </div>
                </dl>

                <a class="button-link" href="/login">Gui lai</a>
            </section>
        </main>
        """);
}

static string Layout(string title, string body)
{
    return $$"""
    <!doctype html>
    <html lang="vi">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{{Html(title)}}</title>
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

            * {
                box-sizing: border-box;
            }

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

            .protocol-band.http {
                background: linear-gradient(135deg, #b42318, #e06f2f);
            }

            .protocol-band.https {
                background: linear-gradient(135deg, #177245, #1f7a8c);
            }

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

            .login,
            .result {
                padding: 28px;
            }

            header {
                margin-bottom: 22px;
            }

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

            input,
            textarea {
                width: 100%;
                border: 1px solid #b7c0cf;
                border-radius: 6px;
                padding: 12px 13px;
                color: var(--ink);
                font: inherit;
                resize: vertical;
                background: white;
            }

            input:focus,
            textarea:focus {
                outline: 3px solid rgba(31, 122, 140, .22);
                border-color: var(--accent);
            }

            button,
            .button-link {
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

            button,
            .button-link {
                margin-top: 22px;
                border: 0;
                padding: 0 18px;
                color: white;
                background: var(--accent);
            }

            dl {
                margin: 0;
                display: grid;
                gap: 14px;
            }

            dl div {
                border-bottom: 1px solid var(--line);
                padding-bottom: 13px;
            }

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

            .received {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .received div {
                min-height: 92px;
                padding: 14px;
                border: 1px solid var(--line);
                border-radius: 8px;
                background: #f9fbfe;
            }

            @media (max-width: 760px) {
                body {
                    place-items: start center;
                    padding: 16px 0;
                }

                .protocol-band {
                    min-height: 110px;
                    display: grid;
                    align-items: end;
                    gap: 8px;
                }

                .protocol-band strong {
                    text-align: left;
                }

                .received {
                    grid-template-columns: 1fr;
                }
            }
        </style>
    </head>
    <body>
        {{body}}
    </body>
    </html>
    """;
}

static string Html(string value) => HtmlEncoder.Default.Encode(value);

internal sealed record PageInfo(string Scheme, int Port, string DisplayUrl, string TransportText)
{
    public static PageInfo FromRequest(HttpRequest request)
    {
        var scheme = request.Scheme;
        var port = request.Host.Port ?? (scheme == "https" ? 443 : 80);
        var displayUrl = $"{scheme}://{request.Host}{request.Path}";
        var transport = scheme == "https"
            ? "Encrypted with TLS on the network"
            : "Clear text on the network";

        return new PageInfo(scheme, port, displayUrl, transport);
    }
}

internal sealed record LoginSubmission(
    string Username,
    string Password,
    string Note,
    DateTimeOffset SubmittedAt);
