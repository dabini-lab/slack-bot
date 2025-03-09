const { WebClient } = require('@slack/web-api');
const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(bodyParser.json());

const client = new WebClient(process.env.SLACK_BOT_TOKEN);

app.post('/slack/events', async (req, res) => {
  const { type, event } = req.body;
  console.log('Received event:', JSON.stringify(req.body, null, 2));

  if (type === 'url_verification') {
    res.send(req.body.challenge);
  } else if (type === 'event_callback' && event.type === 'message') {
    // Ignore bot's own messages and message subtypes (like message_changed)
    if (event.bot_id || event.subtype) {
      return res.sendStatus(200);
    }

    try {
      const result = await client.chat.postMessage({
        channel: event.channel,
        text: event.text
      });
      console.log('Message sent successfully:', result);
      res.sendStatus(200);
    } catch (error) {
      console.error('Error details:', error.data || error);
      res.sendStatus(500);
    }
  } else {
    res.sendStatus(200);
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`⚡️ Express app is running on port ${PORT}!`);
});
