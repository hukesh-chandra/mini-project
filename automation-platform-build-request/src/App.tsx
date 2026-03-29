import { useEffect, useRef, useState } from "react";

interface StepBase {
  delay: number;
}

interface ClickStep extends StepBase {
  type: "click";
  x?: number;
  y?: number;
  selector?: string;
}

interface TypeStep extends StepBase {
  type: "type";
  selector: string;
  value: string;
}

export type Step = ClickStep | TypeStep;

function getUniqueSelector(el: Element): string | undefined {
  if (!(el instanceof Element)) return undefined;
  const id = el.getAttribute("id");
  if (id) return `#${id}`;
  const name = el.getAttribute("name");
  if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
  const classes = el.className
    .toString()
    .split(" ")
    .filter(Boolean)
    .join(".");
  if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
  return el.tagName.toLowerCase();
}

export function App() {
  const [recording, setRecording] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);
  const [lastTime, setLastTime] = useState<number | null>(null);
  const [speed, setSpeed] = useState(1);
  const [targetUrl, setTargetUrl] = useState("https://example.com");
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");

  const recordingRef = useRef(recording);
  recordingRef.current = recording;

  const lastTimeRef = useRef(lastTime);
  lastTimeRef.current = lastTime;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!recordingRef.current) return;
      const now = Date.now();
      const delay = lastTimeRef.current ? now - lastTimeRef.current : 0;
      const target = e.target as Element | null;

      const selector = target ? getUniqueSelector(target) : undefined;

      setSteps((prev) => [
        ...prev,
        {
          type: "click",
          x: e.clientX,
          y: e.clientY,
          selector,
          delay,
        } as ClickStep,
      ]);
      setLastTime(now);
    }

    function handleKeydown(e: KeyboardEvent) {
      if (!recordingRef.current) return;
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName.toLowerCase();
      if (tag !== "input" && tag !== "textarea") return;

      // We'll recapture the full value on keyup to avoid spamming steps
    }

    function handleInput(e: Event) {
      if (!recordingRef.current) return;
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
      if (!target) return;
      const now = Date.now();
      const delay = lastTimeRef.current ? now - lastTimeRef.current : 0;
      const selector = getUniqueSelector(target);

      setSteps((prev) => [
        ...prev,
        {
          type: "type",
          selector: selector || "input",
          value: target.value,
          delay,
        } as TypeStep,
      ]);
      setLastTime(now);
    }

    window.addEventListener("click", handleClick, true);
    window.addEventListener("keydown", handleKeydown, true);
    window.addEventListener("input", handleInput, true);

    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("keydown", handleKeydown, true);
      window.removeEventListener("input", handleInput, true);
    };
  }, []);

  function startRecording() {
    setSteps([]);
    setError("");
    setStatus("Recording...");
    const now = Date.now();
    setLastTime(now);
    lastTimeRef.current = now;
    setRecording(true);
  }

  function stopRecording() {
    setRecording(false);
    setStatus("Recording stopped.");
  }

  function downloadJson() {
    const blob = new Blob([
      JSON.stringify(
        {
          url: targetUrl,
          speed,
          steps,
        },
        null,
        2,
      ),
    ], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function runAutomation() {
    setError("");
    if (!steps.length) {
      setError("No steps recorded yet.");
      return;
    }
    setStatus("Sending workflow to backend...");

    try {
      const res = await fetch("http://localhost:4000/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steps, speed, url: targetUrl }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || `Request failed with status ${res.status}`);
        setStatus("");
        return;
      }

      setStatus("Automation triggered. Check the Puppeteer browser window.");
    } catch (err) {
      console.error(err);
      setError("Failed to reach backend. Is `npm run server` running?");
      setStatus("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Hackathon Automation Recorder</h1>
            <p className="text-slate-400 text-sm mt-1">
              Record clicks and typing on this page, then replay them via Puppeteer.
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={startRecording}
              disabled={recording}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${recording ? "bg-slate-700 text-slate-400 cursor-not-allowed" : "bg-emerald-500 hover:bg-emerald-400 text-slate-900"}`}
            >
              Start Recording
            </button>
            <button
              onClick={stopRecording}
              disabled={!recording}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!recording ? "bg-slate-800 text-slate-400 cursor-not-allowed" : "bg-amber-500 hover:bg-amber-400 text-slate-900"}`}
            >
              Stop Recording
            </button>
          </div>
        </header>

        <section className="grid md:grid-cols-[1.3fr_minmax(0,1fr)] gap-6">
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <label className="flex-1 text-sm">
                  <span className="block text-slate-300 mb-1">Target URL for Puppeteer</span>
                  <input
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </label>
                <label className="text-sm w-full sm:w-40">
                  <span className="block text-slate-300 mb-1">Speed</span>
                  <select
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value) || 1)}
                  >
                    <option value={0.5}>0.5x (slower)</option>
                    <option value={1}>1x (normal)</option>
                    <option value={2}>2x (faster)</option>
                    <option value={4}>4x (very fast)</option>
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  onClick={runAutomation}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-sky-500 hover:bg-sky-400 text-slate-900"
                >
                  Run Automation
                </button>
                <button
                  onClick={downloadJson}
                  disabled={!steps.length}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!steps.length ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-slate-700 hover:bg-slate-600"}`}
                >
                  Download JSON
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-semibold text-slate-200">Built-in recorder</p>
                  <p>
                    Use <strong>Start / Stop Recording</strong> to capture actions on this page. Great for quick demos.
                  </p>
                </div>
                <div className="space-y-1 text-xs text-slate-300">
                  <p className="font-semibold text-slate-200">Any-website mode (paste JSON)</p>
                  <p>
                    Use a simple bookmarklet or script snippet on any site to record <code>steps</code>, then paste the
                    JSON below and click <strong>Load Steps</strong>. Puppeteer will run them against the target URL.
                  </p>
                </div>
              </div>

              {status && <p className="text-emerald-400 text-xs mt-3">{status}</p>}
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-200">Paste workflow JSON</h2>
                <button
                  onClick={() => setSteps([])}
                  disabled={!steps.length}
                  className={`px-2 py-1 rounded-md text-[11px] ${!steps.length ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-slate-800 hover:bg-slate-700"}`}
                >
                  Clear Loaded Steps
                </button>
              </div>
              <p className="text-slate-400 text-[11px]">
                Expecting JSON like <code>{`{"url": "https://site.com", "speed": 1, "steps": [ ... ]}`}</code>. Only
                <code>steps</code> is required; <code>url</code> and <code>speed</code> override the fields above.
              </p>
              <textarea
                className="mt-1 w-full h-32 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 font-mono text-[11px] text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Paste workflow JSON captured from any website here..."
                onBlur={(e) => {
                  const text = e.target.value.trim();
                  if (!text) return;
                  try {
                    const parsed = JSON.parse(text);
                    const newSteps = Array.isArray(parsed) ? parsed : parsed.steps;
                    if (!Array.isArray(newSteps) || !newSteps.length) {
                      setError("Pasted JSON must contain a non-empty steps array.");
                      return;
                    }
                    setSteps(newSteps as Step[]);
                    if (parsed.url && typeof parsed.url === "string") {
                      setTargetUrl(parsed.url);
                    }
                    if (parsed.speed && typeof parsed.speed === "number") {
                      setSpeed(parsed.speed);
                    }
                    setError("");
                    setStatus("Loaded steps from pasted JSON.");
                  } catch (err) {
                    console.error(err);
                    setError("Failed to parse pasted JSON. Check the format.");
                  }
                }}
              />
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 h-72 overflow-auto text-xs font-mono">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-sm font-semibold text-slate-200">Recorded Steps ({steps.length})</h2>
                <button
                  onClick={() => setSteps([])}
                  disabled={!steps.length}
                  className={`px-2 py-1 rounded-md text-[11px] ${!steps.length ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-slate-800 hover:bg-slate-700"}`}
                >
                  Clear
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-slate-300">
{JSON.stringify(steps, null, 2)}
              </pre>
            </div>
          </div>

          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 space-y-2">
              <h2 className="text-sm font-semibold text-slate-200 mb-1">Demo Inputs (for recording)</h2>
              <label className="block mb-2">
                <span className="block text-slate-400 mb-1 text-[11px] uppercase tracking-wide">Email</span>
                <input
                  id="demo-email"
                  name="email"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="you@example.com"
                />
              </label>
              <label className="block mb-2">
                <span className="block text-slate-400 mb-1 text-[11px] uppercase tracking-wide">Password</span>
                <input
                  id="demo-password"
                  name="password"
                  type="password"
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="••••••••"
                />
              </label>
              <button
                id="demo-login"
                className="mt-1 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-900 text-sm font-medium py-2"
              >
                Fake Login Button
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-[11px] text-slate-400 space-y-1">
              <h3 className="text-xs font-semibold text-slate-200 mb-1">How to run</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>In one terminal: <code>npm run dev</code></li>
                <li>In another: <code>npm run server</code> (starts Node + Puppeteer backend)</li>
                <li>Open the app in your browser, click <strong>Start Recording</strong>, interact with the demo inputs, then click <strong>Stop Recording</strong>.</li>
                <li>Click <strong>Run Automation</strong> and watch Puppeteer replay your actions.</li>
              </ol>
              <p className="mt-1">Note: Puppeteer must be able to launch Chrome/Chromium on your machine.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
