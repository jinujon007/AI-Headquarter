# Demo: Build a Landing Page

This is the flagship AI HQ demo workflow — the one shown in the demo video.

**What it demonstrates:** CEO directive → PA routing → multi-agent collaboration → board meeting → delivered files.

**Time:** ~3-5 minutes with Claude (BYOK) | ~8-15 minutes with Ollama (local)

---

## The Prompt

Type this into the CEO chat panel:

```
Build a landing page for a B2B SaaS that helps restaurants manage food waste
```

---

## What Happens

**Step 1 — PA receives and plans (0:00–0:30)**

Alex (PA) receives the directive and responds with a task plan:
- Ray → market research on restaurant food waste management
- Cleo → landing page copy (headline, benefits, CTA)
- Dev → build the HTML file

Watch the 3D office: Alex's status changes to "thinking", then "talking" as he delegates.

**Step 2 — Research (0:30–2:00)**

Ray (Researcher) begins. Ray calls `web_search` with queries like:
- "restaurant food waste management software market"
- "B2B SaaS food waste tools competitors"

Ray writes findings to `output/researcher/[timestamp]-market-research.md`.

Watch the task board: a "Market Research" task appears as "in-progress".

**Step 3 — Copy (parallel with research)**

Cleo (Copywriter) writes landing page copy:
- Headline and subheadline
- 3 benefit sections
- Call-to-action copy

Output: `output/copywriter/[timestamp]-landing-copy.md`

**Step 4 — Board Meeting (2:00–3:00)**

PA triggers a board meeting. Watch the 3D office:
- Alex, Dev, and Cleo walk to the board room
- Each agent speaks (visible in activity feed)
- PA synthesizes their input into a unified brief for Dev

**Step 5 — Development (3:00–4:30)**

Dev (Developer) builds the HTML file using the copy from Cleo and insights from Ray:
- Full HTML5 landing page with inline CSS
- Responsive layout
- Written to `output/dev/[timestamp]-landing-page.html`

Watch the task board: "Build Landing Page" completes. Click the task to view the file.

**Step 6 — Final Report (4:30–5:00)**

PA synthesizes the session and reports back to CEO:
- Summary of what was built
- File paths for all outputs
- Suggested next steps

---

## Viewing the Output

Open the Tasks page in the dashboard. Click any completed task to view its output file inline.

Or find the files directly:
```
output/
├── researcher/
│   └── 2025-05-19T10-28-00-market-research.md
├── copywriter/
│   └── 2025-05-19T10-29-30-landing-copy.md
└── dev/
    └── 2025-05-19T10-31-00-landing-page.html
```

Open `landing-page.html` in your browser to see the completed landing page.

---

## Other Prompts to Try

```
Research the top 5 AI productivity tools for small teams and write a comparison report
```

```
Write a cold email sequence (3 emails) for a SaaS selling to hotel chains
```

```
Analyze the competitive landscape for project management tools in 2025
```

```
Create a product requirements document for a mobile app that tracks personal carbon footprint
```

---

## Tips

- **Faster results:** Use OpenRouter (BYOK) with Claude Sonnet — significantly faster and higher quality than local Ollama
- **Watch the 3D office:** The board meeting is the most visually impressive moment — watch for agents walking to the round table
- **Task board:** Refresh the Tasks page to see all tasks, assigned agents, and output file links
- **Output quality:** The `web_search` tool uses DuckDuckGo by default. Add a [Tavily API key](https://tavily.com) (free tier) in `.env` as `TAVILY_API_KEY` for much better research results
