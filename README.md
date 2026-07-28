# Tasks Plus

The calm GTD app inside Obsidian. Six fixed views over your plain-markdown checkboxes — no database, no query language, no configuration maze. If you've used Things, you know the feel.

This is v0.1.0, the first milestone. It's the native core: views, capture, dates. Screenshots and the community-directory listing come later — right now this is for people who build their plugins from source.

## What it does

- **Six views, and only six** — Inbox, Today, Upcoming, Anytime, Someday, Logbook. In a sidebar leaf or a full tab, with live counts and an Areas/Projects tree.
- **Magic quick capture** — one command (assign it a hotkey), a floating modal from anywhere. Type "call mom tomorrow" and it becomes the task *call mom*, due tomorrow, in your Inbox. Works from outside Obsidian too, via `obsidian://tasks-plus/capture?text=…`.
- **Insert task** — the same modal, but while writing a note: it drops the finished task line at your cursor, dates and markers included, so you never type the emoji format by hand.
- **Natural-language dates** — today, tomorrow, fri, next mon, next week, in 2w, 2026-08-15. A small hand-rolled parser, no heavy dependency.
- **Tasks stay markdown** — every task is an ordinary `- [ ]` checkbox in a note. Completing one checks the box and appends the done date in place. Nothing moves, nothing is copied into a database. Delete the plugin and you lose nothing.
- **The vault is the app** — folders under your Tasks folder are areas, notes are projects. Any checkbox anywhere in the vault shows up too (toggleable), and editing it always writes back to its source line only.
- **Daily-note block** (optional, off by default) — a managed block in today's daily note listing what's due today.

## How tasks are stored

Inline metadata, readable by humans and compatible with the emoji format of the Tasks plugin, so existing vaults migrate in without conversion:

```markdown
- [ ] call mom 📅 2026-08-01
- [ ] review draft ⏳ 2026-08-03
- [ ] submit application ⏰ 2026-08-15
- [x] pay rent 📅 2026-07-28 ✅ 2026-07-28
- [ ] plan the autumn trip 💤
- [ ] finish slides ⭐
```

📅 due · ⏳ scheduled · ⏰ deadline · ✅ done · ⭐ starred for Today · 💤 someday. Deadlines get their own chip that turns red as the day approaches; "report by fri" in capture sets one.

## The six views

Every open task lives in exactly one view (someday wins over starred, starred over dates, dates over the rest):

- **Inbox** — tasks in `Tasks/Inbox.md` you haven't dated, starred, or filed yet.
- **Today** — due or scheduled up to today, plus anything you starred.
- **Upcoming** — future dates, grouped by day for the next week, then by month.
- **Anytime** — filed in a project, no date. The "get on with it" list.
- **Someday** — marked 💤; resting until you wake it.
- **Logbook** — done tasks, newest first, grouped by day.

Keyboard, in any view: `j`/`k` navigate, `x` toggle done, `t` star, `s` schedule, `d` deadline, `m` move, `Enter` open the source note. In the capture modal: `⌘T` star, `⌘S` someday — no mouse needed anywhere.

## Settings

- Tasks folder location (default `Tasks/`)
- Show tasks from the whole vault (default on)
- First day of week
- Today's tasks in the daily note (default off)

## Installation

Not yet in the community directory. Manual install:

1. Run `npm install && npm run build`
2. Copy `main.js`, `manifest.json`, and `styles.css` into your vault at `.obsidian/plugins/tasks-plus/`
3. Reload Obsidian and enable the plugin under **Settings → Community plugins**

Works on desktop and mobile.

## What it deliberately doesn't do

No recurring tasks, priorities, time tracking, kanban, reminders, custom queries or filters, drag-and-drop reordering, or import bridges — the restraint is the product. Some of these may come in later milestones; most won't.

## License

0BSD
