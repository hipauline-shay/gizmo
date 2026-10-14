# Changelog

## 1.0.10 — 2026-10-14

- The first-run key card shows the real price: about 35 cents to check one screen or feature, with the price shown before and after every scan.
- Listed under the AI category.

## 1.0.9 — 2026-10-14

- "What I changed this week" now looks like the other suggestions instead of being highlighted.

## 1.0.8 — 2026-10-14

- "What I changed this week" disappears once your report already has it, and Rescan on that tab picks the week's newest files again.
- Gizmo runs one scan at a time, and the chips pause for a moment after a tap, so a double tap never starts two paid scans.
- "Try again" repeats exactly the scan that failed.
- If you save a file while Gizmo reads it, you keep the (already paid) answer with a note instead of an error.
- Each area's cost is exact, even when you ask a question during a scan.
- Files you pick by hand are now also never sent when they are outside the project or listed in .gitignore.

## 1.0.7 — 2026-10-14

- **Type or tap, and Gizmo scans.** Ask about a screen or feature and Gizmo scans its best-matching files straight away. No more file list or "pick a section" step.
- **Your project's areas as chips.** Gizmo suggests the areas that actually exist in your project (for example Camera, Onboarding, Settings), leaving out the ones you already scanned.
- **"What I changed this week."** One tap scans the code you changed in the last 7 days (from git, or from file dates without git), newest first, and says how much of the week it covered.
- The cost of an area is shown right under the box, before you scan.

## 1.0.6 — 2026-10-14

- **Read it to me** always reads the box it sits in: Gizmo's card reads Gizmo's note on every tab, and "Share with your team" has its own Read it to me for the team update.
- The cost line now belongs to the tab you are on: what this area cost, what combining the areas cost, or nothing yet on "+ Add area", plus your session total.
- When a search matches many files inside "+ Add area", the area choices now sit at the top of the tab instead of jumping to the middle.

## 1.0.5 — 2026-10-14

- **Scan by area.** Gizmo now scans one screen or feature at a time, and each one gets its own tab. **+ Add area** scans the next one (up to 4 per report), and the **Summary** tab combines them all: one "Can we ship?", blockers per area, and one team update.
- **Smaller, more reliable scans.** One area is up to 6 files and about 60,000 characters, and Gizmo asks only for what the panel shows. Answers are about half as long: faster, cheaper, and far less likely to fail.
- **No surprise charges.** Gizmo shows the estimated cost before a scan, blocks a selection that is too big before anything is sent, and never retries on its own.
- Right-click a file → **Gizmo: Add to Report** adds it as a new area.
- Questions, boss replies, Export brief, and Jira tickets now cover every area in the report.

## 1.0.4 — 2026-10-14

- Fixed: scanning a flow with branching steps (like the camera flow) could fail with "The AI response could not be understood". Claude sometimes numbered a branch "4a", which made the whole answer unreadable. Gizmo now asks for whole step numbers and repairs a stray value like this instead of failing.

## 1.0.3 — 2026-10-13

- Big scans no longer fail with "The AI response could not be understood" because of one small slip in Claude's answer. Gizmo now repairs small format slips and skips a single malformed item instead of discarding the whole analysis.
- The store page now shows screenshots, and links to the source code, issues, and the author's portfolio.

## 1.0.2 — 2026-10-12

- **Read it to me** now uses Gizmo's British voice from the very first click. Before, the first read could fall back to your computer's default voice, because the voice list loads a moment after the panel opens.

## 1.0.1 — 2026-10-12

- **Read it to me** on every Gizmo answer and reply draft, not just his card. Gizmo now speaks with a British voice.
- **Help me answer my boss** asks who's asking. A boss or client gets a short, plain answer with no code talk; a CTO or engineer gets the technical details. You get only the reply, ready to send.
- Ask Gizmo answers are shorter and in plain words, with the answer first.
- **Open in email** now includes the whole update (it used to stop at an "&").
- The Check and Summary tabs each keep their own scroll position.
- The Gizmo panel keeps its size and place when you ask a question.
- For big questions, the best-matching group of files is listed first.

## 1.0.0 — 2026-10-07

First public release of Gizmo by Celestial Works.

- Gizmo, a block dragon, sits at the top of the panel and tells you in one line what he found. His pose changes as he reads, when something is blocking, and when you're clear.
- **Check** tab: a verdict, Open items you can check off, defer, or dismiss, UX states, what's working, and a requirements check.
- **Summary** tab: "Can we ship?", what's blocking release, recommended priorities, and a ready-to-paste team update.
- **Share**: one button copies the update as plain text, or opens it in email.
- **Ask Gizmo**: plain-language answers about what you built, with Copy and Open in email. "Help me answer my boss" drafts a reply from what's actually built.
- **Read it to me**: Gizmo reads his notes aloud.
- Runs on your own Anthropic API key with Claude Opus 5.5, and shows the estimated cost after every run.
- Privacy: `.env` and key files are never sent, key-looking strings inside code are masked before sending, and the panel shows how many were masked.
