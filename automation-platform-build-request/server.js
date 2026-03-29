import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json({ limit: "1mb" }));

app.post("/api/run", async (req, res) => {
  const { steps, speed = 1, url = "https://example.com" } = req.body || {};

  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: "steps array is required" });
  }

  try {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    let lastTimestamp = 0;

    for (const step of steps) {
      const delay = Math.max(0, (step.delay || 0) / (speed || 1));
      if (delay) {
        await page.waitForTimeout(delay);
      }

      if (step.type === "click") {
        if (step.selector) {
          try {
            await page.click(step.selector, { delay: 50 });
          } catch (err) {
            console.error("Click by selector failed", step.selector, err);
          }
        } else if (typeof step.x === "number" && typeof step.y === "number") {
          await page.mouse.click(step.x, step.y, { delay: 50 });
        }
      } else if (step.type === "type") {
        if (!step.selector || typeof step.value !== "string") continue;
        try {
          await page.focus(step.selector);
          await page.keyboard.type(step.value, { delay: 50 / (speed || 1) });
        } catch (err) {
          console.error("Type failed", step.selector, err);
        }
      }
      lastTimestamp = Date.now();
    }

    res.json({ ok: true });

    // Keep browser open for manual inspection; close after some time
    setTimeout(() => {
      browser.close().catch(() => {});
    }, 30000);
  } catch (err) {
    console.error("Automation run failed", err);
    return res.status(500).json({ error: "Automation run failed", details: String(err) });
  }
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`Automation server listening on http://localhost:${PORT}`);
});
