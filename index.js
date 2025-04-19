const { WebClient } = require("@slack/web-api");
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const { GoogleAuth } = require("google-auth-library");

dotenv.config();

const config = {
  maxMessagesLength: 5,
};

const auth = new GoogleAuth();

const app = express();
app.use(bodyParser.json());

const client = new WebClient(process.env.SLACK_BOT_TOKEN);
const ENGINE_URL = process.env.ENGINE_URL;

app.post("/slack/events", async (req, res) => {
  const { type, event } = req.body;

  if (event.type === "url_verification") {
    res.status(200).send(req.body.challenge);
    return;
  }

  // Immediately acknowledge the webhook
  res.sendStatus(200);

  if (type === "event_callback" && event.type === "app_mention") {
    try {
      // Get user info to retrieve the display name
      const userInfo = await client.users.info({
        user: event.user,
      });

      const speaker_name =
        userInfo.user.profile.display_name || userInfo.user.name;

      const authClient = await auth.getIdTokenClient(ENGINE_URL);
      const prompt = event.text.replace(/<@[A-Z0-9]+>/, "").trim();

      const requestBody = {
        messages: [prompt],
        session_id: `slack-${event.channel}`,
        speaker_name: speaker_name,
      };

      const response = await authClient.request({
        url: `${ENGINE_URL}/messages`,
        method: "POST",
        data: requestBody,
      });

      const replyMessages = response.data.messages;
      const limitedReplyMessages = replyMessages.slice(
        0,
        config.maxMessagesLength
      );
      for (const message of limitedReplyMessages) {
        if (message) {
          await client.chat.postMessage({
            channel: event.channel,
            text: message,
          });
        }
      }
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
