# AI HQ — Testing Guide (for humans, no coding required)

This guide gets you from zero to watching your AI office work, and tells you
exactly what you should see at every step — and what "broken" looks like.

---

## 1. Start everything (3 commands)

Open a terminal in the project folder and run:

```bash
ollama serve        # skip if Ollama is already running (system tray icon)
npm run dev         # starts both the agent server and the dashboard
```

Then open **http://localhost:3000** in your browser.
Log in with the `ADMIN_PASSWORD` from your `.env` file.

> First time here? Run the one-time setup first: install [Node.js 22+](https://nodejs.org)
> and [Ollama](https://ollama.com), then `ollama pull llama3.2:3b`,
> `cp .env.example .env` (edit the password), and `npm install`.

---

## 2. The demo command

Open the **Office** page, find the chat panel, and type:

> Build me a landing page for a B2B SaaS that helps restaurants manage food waste

Watch for these **6 checkpoints** (2–7 minutes on the free local model):

| # | What you should see | Where |
|---|--------------------|-------|
| 1 | Alex (PA) replies in a few seconds naming who gets the work | Chat |
| 2 | Tasks appear, one per specialist, marked in progress | Tasks page |
| 3 | Agents' status dots change; avatars work at their desks | 3D office / Agents |
| 4 | Agents move to the Board Room briefly when work wraps up | 3D office |
| 5 | Alex sends a final report message ("…files are in output/…") | Chat |
| 6 | Real files exist in `apps/server/output/<agent>/` — open the `.html` one in a browser | Your file explorer |

Also check the **Costs** page: with Ollama everything should say **$0.00**.

---

## 3. Try hiring

In the chat, ask Alex directly, or use the Agents page "hire" action:

> Hire a financial analyst named Fiona

You should see: a new desk appears in the 3D office, Fiona introduces herself
in chat, and future relevant commands can be routed to her.

---

## 4. What "broken" looks like (and what to do)

| Symptom | Meaning | First move |
|---------|---------|-----------|
| Chat replies "Could not reach the model…" | Ollama isn't running or the model isn't pulled | `ollama serve`, then `ollama pull llama3.2:3b` |
| A task shows **failed** with a toast | The model gave an empty/broken answer — this is honest failure, not a hang | Send the command again |
| A task sits in progress for 10+ minutes | Genuine bug — this should never happen | Restart with `npm run dev`; old stuck tasks auto-mark as failed |
| Raw `{"reply": ...` JSON in chat | Parser bug — should never happen | Report it (below) with a screenshot |
| SERVER light red in the status bar | The agent server is down | Check the terminal running `npm run dev` for errors |
| Page won't load at all | Dashboard is down | Same — check the terminal |

**Where to report:** open a GitHub issue using the bug template. Paste what you
typed, what you saw, and (if you can) the last lines from the **Logs** page in
the dashboard — that page shows the server's recent console output.

---

## 5. Optional: try a paid model (BYOK)

1. Settings → paste an API key (Anthropic, OpenAI, Groq, Gemini, or OpenRouter).
2. Set a **Monthly Budget Cap** on the same page (e.g. `5`) — when month-to-date
   spend hits the cap, paid calls are refused with a clear message instead of
   silently billing you.
3. Send the demo command again — Alex's reply now includes an estimated cost
   for the run, and the Costs page tracks real spend against your cap.

That's it. If all 6 checkpoints pass, the product works.
