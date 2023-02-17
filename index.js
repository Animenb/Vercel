const { google } = require("googleapis");
const { OAuth2 } = google.auth;
const oauth2Client = new OAuth2(
  YOUR_CLIENT_ID,
  YOUR_CLIENT_SECRET,
  YOUR_REDIRECT_URI
);

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!path.toLowerCase().startsWith("/api")) {
    return new Response(
      "libDrive for Cloudflare doesn't work on its own. It is only an extention to the backend."
    );
  } else if (path.toLowerCase().startsWith("/api/v1/download")) {
    const session = JSON.parse(atob(url.searchParams.get("session")));
    const drive = new googleDrive(session);
    return drive.downloadAPI(request.headers.get("Range") || "", session);
  }
}

class googleDrive {
  constructor(session) {
    let token_expiry = new Date(
      session.token_expiry || new Date().toISOString()
    );
    token_expiry = token_expiry.getTime();
    this.oauth2Client = oauth2Client;
    this.oauth2Client.setCredentials({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      token_type: "Bearer",
      expiry_date: token_expiry,
    });
  }

  async downloadAPI(range, session) {
    if (session.transcoded == true && session.cookie) {
      let requestOption = {
        method: "GET",
        headers: {
          Cookie: session.cookie,
          Range: range,
        },
      };
      let resp = await fetch(session.url, requestOption);
      let { headers } = (resp = new Response(resp.body, resp));
      headers.append("Access-Control-Allow-Origin", "*");
      headers.set("Content-Disposition", "inline");
      headers.set("Access-Control-Allow-Headers", "*");
      headers.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate"
      );
      headers.set("pragma", "no-cache");
      return resp;
    } else {
      await this.oauth2Client.getRequestHeaders().then((headers) => {
        headers.Range = range;
        return headers;
      });
      let resp = await fetch(session.url, { headers });
      let { headers } = (resp = new Response(resp.body, resp));
      headers.append("Access-Control-Allow-Origin", "*");
      headers.set("Content-Disposition", "inline");
      headers.set("Access-Control-Allow-Headers", "*");
      headers.set(
        "Cache-Control",
        "no-cache, no-store, must-revalidate"
      );
      headers.set("pragma", "no-cache");
      return resp;
    }
  }
}
