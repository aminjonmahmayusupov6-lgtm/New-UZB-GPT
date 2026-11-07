const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    name: "AI BEK",
    provider: "Cohere",
    configured: Boolean(process.env.COHERE_API_KEY)
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];
    if (!message) return res.status(400).json({ error: "Xabar bo‘sh bo‘lmasin." });
    if (!process.env.COHERE_API_KEY) {
      return res.status(503).json({
        error: "AI hali sozlanmagan: Render Environment’da COHERE_API_KEY qo‘shilishi kerak."
      });
    }

    const messages = [
      {
        role: "system",
        content: "Siz AI BEK nomli yordamchisiz. Asosan o‘zbek tilida, lotin yozuvida, aniq va samimiy javob bering. Bilmagan narsangizni to‘qib chiqarmang."
      },
      ...history
        .filter(x => ["user", "assistant"].includes(x?.role) && typeof x?.content === "string")
        .map(x => ({ role: x.role, content: x.content.slice(0, 4000) })),
      { role: "user", content: message.slice(0, 4000) }
    ];

    const response = await fetch("https://api.cohere.com/v2/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.COHERE_API_KEY}`,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify({
        model: process.env.COHERE_MODEL || "command-a-plus-05-2026",
        messages,
        temperature: 0.7
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Cohere API error:", data);
      return res.status(response.status).json({
        error: data?.message || data?.error?.message || "Cohere AI xizmatida xatolik."
      });
    }

    const reply = (data.message?.content || [])
      .filter(item => item.type === "text")
      .map(item => item.text)
      .join("\n")
      .trim();

    res.json({ reply: reply || "Javob olinmadi." });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI BEK listening on ${port}`));
