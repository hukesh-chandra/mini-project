# Hackathon Web Automation Recorder

A simple, hackathon-ready web automation platform:

- **Frontend**: React + Vite + Tailwind
- **Backend**: Node.js + Express + Puppeteer
- **Features**:
  - Record clicks and typing on the app page (with delays)
  - View and download the workflow JSON
  - Paste workflow JSON captured from **any website**
  - Speed control (0.5x, 1x, 2x, 4x)
  - Puppeteer backend that replays the steps in a real browser

---

## 1. Getting started

### Install dependencies

```bash
npm install
```

### Run the frontend (React app)

```bash
npm run dev
```

Open the URL printed in the terminal (usually `http://localhost:5173`).

### Run the backend (Node + Puppeteer)

In a **second terminal**:

```bash
npm run server
```

This starts an Express server on `http://localhost:4000` and will use Puppeteer to open a real browser window when you run automations.

---

## 2. Data model: workflow JSON

The workflow is just JSON with a list of steps plus some metadata:

```json
{
  "url": "https://example.com",   // optional; default is https://example.com
  "speed": 1,                      // optional; 1 = normal, 2 = 2x faster, 0.5 = slower
  "steps": [
    { "type": "click", "selector": "#login-button", "delay": 500 },
    { "type": "type",  "selector": "#email", "value": "test@example.com", "delay": 300 }
  ]
}
```

Each step:

- `type`: `"click"` or `"type"`
- `delay`: time in **milliseconds** since the previous step
- For `click` steps:
  - `selector` (preferred) **or** `x` + `y` coordinates
- For `type` steps:
  - `selector`: CSS selector to focus the element
  - `value`: text to type

The backend takes `delay` and scales it by `1 / speed` (so speed = 2 means delays are cut in half).

---

## 3. Using the built-in recorder (quick demo)

This is the easiest way to demo the project without involving other websites.

1. **Start both servers**
   - `npm run dev`
   - `npm run server`

2. **Open the frontend** in your browser (e.g. `http://localhost:5173`).

3. In the UI:
   - Make sure `Target URL for Puppeteer` is set (default is `https://example.com`).
   - Adjust `Speed` if you like (1x is default).

4. **Record actions** on the app page:
   - Click **Start Recording**.
   - Use the demo fields on the right:
     - Type into **Email** and **Password**.
     - Click **Fake Login Button**.
   - Click **Stop Recording**.

5. Inspect the `Recorded Steps` panel to see the captured steps JSON.

6. Click **Run Automation**.
   - The backend (`npm run server`) will:
     - Launch a Chromium/Chrome window using Puppeteer.
     - Navigate to the target URL you specified.
     - Replay the recorded `click` and `type` steps at the configured speed.

7. (Optional) Click **Download JSON** to save the workflow as `workflow.json`.

This mode is great for a live hackathon demo because everything stays inside the app and is very predictable.

---

## 4. Any-website mode (paste JSON)

To work with **any website**, you need to capture steps **from that website** itself. The backend already supports this: it just needs a `steps` array and a `url`.

The simplest hackathon approach is:

1. Use a **small script or bookmarklet** on the target site to record events.
2. Copy the resulting JSON.
3. Paste it into this app.
4. Click **Run Automation** to replay it via Puppeteer.

### 4.1. UI support for pasted JSON

In the main panel you’ll see a section called **"Paste workflow JSON"**.

- Paste JSON into the textarea in this shape:

  ```jsonc
  {
    "url": "https://the-site-you-recorded.com", // optional
    "speed": 1,                                   // optional
    "steps": [                                    // required
      { "type": "click", "selector": "#some-button", "delay": 500 },
      { "type": "type",  "selector": "#email", "value": "you@example.com", "delay": 300 }
    ]
  }
  ```

- When you **blur** (click outside the textarea), the app will:
  - Parse the JSON.
  - If it finds a non-empty `steps` array, it loads it as the current workflow.
  - If there is a `url` string, it updates the **Target URL** field.
  - If there is a numeric `speed`, it updates the **Speed** dropdown.
  - If parsing fails or `steps` is missing/empty, it shows a clear error.

You can now just press **Run Automation**, and Puppeteer will:

- Open the specified `url` (or the value in the input field), and
- Replay the pasted steps.

### 4.2. Example: simple bookmarklet-style recorder snippet

Below is a small, self-contained JavaScript recorder you can adapt. It’s not part of the built app, but you can run it in the browser console or turn it into a bookmarklet for quick experiments.

```js
(function () {
  const steps = [];
  let lastTime = Date.now();

  function getSelector(el) {
    if (!el || el.nodeType !== 1) return "";
    if (el.id) return "#" + el.id;
    if (el.name) return el.tagName.toLowerCase() + '[name="' + el.name + '"]';
    if (el.className && typeof el.className === "string") {
      const cls = el.className.split(/\s+/).filter(Boolean).join(".");
      if (cls) return el.tagName.toLowerCase() + "." + cls;
    }
    return el.tagName.toLowerCase();
  }

  function nowDelay() {
    const now = Date.now();
    const delay = now - lastTime;
    lastTime = now;
    return delay;
  }

  function onClick(e) {
    const delay = nowDelay();
    const target = e.target;
    const selector = getSelector(target);
    steps.push({ type: "click", selector, delay });
    console.log("Recorded click", selector);
  }

  function onInput(e) {
    const target = e.target;
    if (!target || (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA")) return;
    const delay = nowDelay();
    const selector = getSelector(target);
    steps.push({ type: "type", selector, value: target.value, delay });
    console.log("Recorded type", selector, target.value);
  }

  window.addEventListener("click", onClick, true);
  window.addEventListener("input", onInput, true);

  window.__automationRecorderStop = function () {
    window.removeEventListener("click", onClick, true);
    window.removeEventListener("input", onInput, true);
    const payload = {
      url: window.location.href,
      speed: 1,
      steps,
    };
    console.log("Recording complete. JSON below:");
    console.log(JSON.stringify(payload, null, 2));
    alert("Recording stopped. Open the console to copy the JSON.");
  };

  alert(
    "Recorder started on this page. Interact normally, then run __automationRecorderStop() in the console to finish."
  );
})();
```

Usage (for quick tests):

1. Open **any website** in your browser.
2. Open DevTools → Console.
3. Paste the script above and press Enter.
4. Interact with the page (clicks and typing will be recorded).
5. In the console, run:

   ```js
   __automationRecorderStop();
   ```

6. Copy the printed JSON object from the console.
7. Go back to the React app, paste this JSON into the **Paste workflow JSON** box.
8. Click outside the textarea to load it.
9. Press **Run Automation**.

You now have a basic “record on any site, replay via Puppeteer” loop.

---

## 5. Backend: how replay works

The backend is defined in `server.js` and exposes:

- `POST /api/run`
- `GET /health`

### POST /api/run

Request body:

```jsonc
{
  "url": "https://example.com", // optional
  "speed": 1,                     // optional
  "steps": [ /* required */ ]
}
``

Behavior:

1. Validates that `steps` is a non-empty array; otherwise returns `400`.
2. Launches Puppeteer (`headless: false` so you can see the browser).
3. Opens a new page and navigates to `url` (default `https://example.com`).
4. For each step:
   - Waits for `step.delay / speed` milliseconds.
   - If `type === "click"`:
     - Prefers `selector` → `page.click(selector)`.
     - Falls back to `x`/`y` → `page.mouse.click(x, y)` if provided.
   - If `type === "type"`:
     - Focuses `selector` → `page.focus(selector)`.
     - Types `value` using `page.keyboard.type` (typing speed is also scaled by `speed`).
5. Returns `{ "ok": true }` on success.
6. Schedules the browser to close after ~30 seconds.

Basic error handling:

- If a specific step fails (bad selector, etc.), it logs the error but continues with the next step.
- If the whole run fails (Pupeeteer launch, navigation, etc.), it returns `500` with a JSON error message.

---

## 6. Typical hackathon demo flow

1. **Setup**
   - Clone the repo.
   - Run `npm install`.
   - Start `npm run dev` and `npm run server`.

2. **Quick app-only demo** (safe, predictable):
   - Use the built-in recorder with the demo form.
   - Show the JSON updating live.
   - Click **Run Automation** to show Puppeteer replay.

3. **Any-site wow moment** (optional):
   - On a separate website, paste the sample recorder script into DevTools console.
   - Interact with the site, then stop recording and copy the JSON.
   - Paste into the app’s **Paste workflow JSON** box.
   - Click **Run Automation**.
   - Watch Puppeteer open that site and replay the exact interactions.

This keeps the architecture simple while still giving you a compelling “record & replay any website” story for a hackathon.
