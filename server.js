const express = require("express");
const path = require("path");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "AI BEK", configured: Boolean(process.env.OPENAI_API_KEY) });
});

app.post("/api/chat", async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-12) : [];
    if (!message) return res.status(400).json({ error: "Xabar bo‘sh bo‘lmasin." });
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "AI hali sozlanmagan: Render Environment’da OPENAI_API_KEY qo‘shilishi kerak." });
    }

    const messages = [
      { role: "system", content: "Siz AI BEK nomli yordamchisiz. Asosan o‘zbek tilida, lotin yozuvida, aniq va samimiy javob bering. Bilmagan narsangizni to‘qib chiqarmang." },
      ...history.filter(x => ["user", "assistant"].includes(x?.role) && typeof x?.content === "string")
        .map(x => ({ role: x.role, content: x.content.slice(0, 4000) })),
      { role: "user", content: message.slice(0, 4000) }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages, temperature: 0.7 })
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || "AI xizmatida xatolik." });
    }
    res.json({ reply: data.choices?.[0]?.message?.content || "Javob olinmadi." });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Serverda xatolik yuz berdi." });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`AI BEK listening on ${port}`));
