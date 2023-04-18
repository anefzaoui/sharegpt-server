const express = require("express");
const app = express();
const path = require("path");
const fs = require("fs-extra");
const uuid = require("uuid");
const cors = require("cors");
const bodyParser = require("body-parser");
const sanitizeHtml = require("sanitize-html");

// Enable CORS for all routes
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));

app.use(express.static(path.join(__dirname, "public")));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

/**
 * Save conversation endpoint
 */
app.post("/save-conversation", async (req, res) => {
  let conversation = req.body.conversation;
  const conversationId = uuid.v4();
  const filePath = `conversations/${conversationId}.html`;

  // Find the img tag and replace the src with "/style/img/avatar.png"
  conversation = conversation.replace(/<img[^>]*src="[^"]*"/g, '<img src="/style/img/avatar.png"');
  conversation = conversation.replace(/<img(?![^>]*\bclass=)[^>]*>/g, "");

  const groupDivWithSvgRegex = /(<div[^>]*class=["'](?:.*\s)?group(?:\s.*)?["'][^>]*>)([\s\S]*?<svg[\s\S]*?<\/svg>)/i;

  // Replace the first SVG within a .group div with the provided image tag
  conversation = conversation.replace(groupDivWithSvgRegex, (match, divStart, svgContent) => {
    return divStart + '<img src="/style/img/chatgpt-icon.png" />';
  });

  // Sanitize the conversation HTML
  const cleanConversation = sanitizeHtml(conversation, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img"]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class"], // Allow 'class' attribute for all elements
      img: ["src"],
    },
  });

  fs.writeFile(filePath, cleanConversation, (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Failed to save conversation." });
    } else {
      return res.json({ url: `/c/${conversationId}` });
    }
  });
});

app.get("/c/:conversationId", async (req, res) => {
  const conversationId = req.params.conversationId;
  const filePath = `conversations/${conversationId}.html`;

  if (await fs.pathExists(filePath)) {
    const conversationContent = await fs.readFile(filePath, "utf-8");
    res.render("conversation", { conversationContent });
  } else {
    res.status(404).send("Conversation not found");
  }
});

app.get("/c/", async (req, res) => {
  res.render("main");
});

app.get("/", async (req, res) => {
  res.render("main");
});

const port = process.env.PORT || 3110;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
