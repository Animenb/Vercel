// Import necessary modules
const fetch = require("node-fetch");

// Define your serverless function
module.exports = async (req, res) => {
  const url = new URL(req.url);
  const path = url.pathname;
  if (!path.toLowerCase().startsWith("/api")) {
    res.status(400).send(
      "libDrive for Cloudflare doesn't work on its own. It is only an extension to the backend."
    );
  } else if (path.toLowerCase().startsWith("/api/v1/download")) {
    const session = JSON.parse(Buffer.from(url.searchParams.get("session"), "base64").toString("ascii"));
    const drive = new googleDrive(session);
    const range = req.headers.range || "";
    const resp = await drive.downloadAPI(range, session);
    res.set(resp.headers);
    res.status(resp.status);
    res.send(await resp.buffer());
  }
};

// Define the googleDrive class
class googleDrive {
  constructor(session) {
    let token_expiry = new Date(session.token_expiry || new Date().toISOString());
    token_expiry = token_expiry.getTime();
    this.config = {
      access_token: session.access_token,
      client_id: session.client_id,
      client_secret: session.client_secret,
      refresh_token: session.refresh_token,
      token_expiry: token_expiry,
    };
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
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("pragma", "no-cache");
      return resp;
    } else {
      await this.setAccessToken();
      let requestOption = {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.config.access_token}`,
          Range: range,
        },
      };
      let resp = await fetch(session.url, requestOption);
      let { headers } = (resp = new Response(resp.body, resp));
      headers.append("Access-Control-Allow-Origin", "*");
      headers.set("Content-Disposition", "inline");
      headers.set("Access-Control-Allow-Headers", "*");
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("pragma", "no-cache");
      return resp;
    }
  }

  async setAccessToken() {
    if (
      this.config.token_expiry == undefined ||
      this.config.token_expiry < Date.now()
    ) {
      const obj = await this.getAccessToken();
      if (obj.access_token != undefined) {
        this.config.access_token = obj.access_token;
        this.config.token_expiry = obj.token_expiry;
      }
    }
  }
