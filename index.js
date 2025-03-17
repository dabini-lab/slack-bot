const { WebClient } = require("@slack/web-api");
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { GoogleAuth } = require("google-auth-library");

dotenv.config();

const auth = new GoogleAuth();

const app = express();
app.use(bodyParser.json());

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const ENGINE_URL = process.env.ENGINE_URL;

app.post("/slack/events", async (req, res) => {
  const { type, event } = req.body;
  console.log("Received event:", JSON.stringify(req.body, null, 2));

  // Immediately acknowledge the webhook
  res.sendStatus(200);

  if (type === "url_verification") {
    res.send(req.body.challenge);
  } else if (type === "event_callback" && event.type === "app_mention") {
    try {
      const authClient = await auth.getIdTokenClient(ENGINE_URL);
      const prompt = event.text.replace(/<@[A-Z0-9]+>/, "").trim();

      const requestBody = {
        messages: [prompt],
        thread_id: `slack-${event.channel}`,
      };

      const response = await authClient.request({
        url: `${ENGINE_URL}/messages`,
        method: "POST",
        data: requestBody,
      });

      const reply = response.data.response.content;

      const result = await client.chat.postMessage({
        channel: event.channel,
        text: reply,
      });
    } catch (error) {
      console.error("Error details:", error.data || error);
      await client.chat.postMessage({
        channel: event.channel,
        text: "Engine API 호출 중 문제가 발생했어.",
      });
    }
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`⚡️ Express app is running on port ${PORT}!`);
});
