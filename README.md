# Tasks Plus

The calm GTD app inside Obsidian. Six fixed views over your plain-markdown checkboxes — no database, no query language, no configuration maze. If you've used Things, you know the feel.

Install it from Obsidian's community plugins directory.

## What it does

- **Six views, and only six** — Inbox, Today, Upcoming, Anytime, Someday, Logbook. In a sidebar leaf or a full tab, with live counts and an Areas/Projects tree.
- **Magic quick capture** — one command (assign it a hotkey), a floating modal from anywhere. Type "call mom tomorrow" and it becomes the task *call mom*, due tomorrow, in your Inbox. Works from outside Obsidian too, via `obsidian://tasks-plus/capture?text=…`.
- **Insert task** — the same modal, but while writing a note: it drops the finished task line at your cursor, dates and markers included, so you never type the emoji format by hand.
- **Natural-language dates** — today, tomorrow, fri, next mon, next week, in 2w, 2026-08-15. A small hand-rolled parser, no heavy dependency.
- **Tasks stay markdown** — every task is an ordinary `- [ ]` checkbox in a note. Completing one checks the box and appends the done date in place. Nothing moves, nothing is copied into a database. Delete the plugin and you lose nothing.
- **The vault is the app** — folders under your Tasks folder are areas, notes are projects. Any checkbox anywhere in the vault shows up too (toggleable), and editing it always writes back to its source line only.
- **Tags as cross-note grouping** — write an ordinary `#tag` inside any task (or use the tag button / `g`) and it shows up in a Tags section in the rail. Click one or several (selection is a union) to see every tagged task across the vault, grouped under collapsible Inbox/Today/Upcoming/Anytime/Someday/Logbook headers, each row still linking to its source note.
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

Keyboard, in any view: `j`/`k` navigate, `x` toggle done, `t` star, `s` schedule, `d` deadline, `g` tag, `Enter` open the source note. In the capture modal: `⌘T` star, `⌘S` someday — no mouse needed anywhere.

Row action buttons stay visible in Inbox for quick sorting; in every other view they appear on hover (or on tap, on phone and tablet).

## Settings

- Tasks folder location (default `Tasks/`)
- Show tasks from the whole vault (default on)
- First day of week
- Today's tasks in the daily note (default off)

## Installation

1. Open **Settings → Community plugins → Browse**.
2. Search for **Tasks Plus**, then **Install** and **Enable**.

Works on desktop and mobile.

## What it deliberately doesn't do

No recurring tasks, priorities, time tracking, kanban, reminders, custom queries or filters, drag-and-drop reordering, or import bridges — the restraint is the product. Some of these may come in later milestones; most won't.

## Privacy

Everything is local — no network requests, no telemetry, nothing leaves the vault. With "Show tasks from the whole vault" on (the default), the plugin scans your markdown files' cached metadata to find checkboxes; turn it off and it only ever touches the tasks folder.

## Plus Plugin Family

Part of the **Plus Plugin Family** for Obsidian — free, open-source, local-first:

- **[Paste Plus](https://github.com/jabaho9523/obsidian-paste-plus)** — Smart paste: URLs become titled links, images get clean filenames, HTML converts to markdown.
- **[Vault Plus](https://github.com/jabaho9523/obsidian-vault-plus)** — Vault health dashboard: find and fix orphans, broken links, empty notes, duplicates, and more.
- **[Link Plus](https://github.com/jabaho9523/obsidian-link-plus)** — Find every unlinked mention in your vault and convert them to wikilinks — one click or batch.
- **[Meetings Plus](https://github.com/jabaho9523/obsidian-meetings-plus)** — Subscribe to calendars and create pre-filled meeting notes in one click. ICS-based, privacy-first.
- **Tasks Plus** — Calm GTD over plain markdown: Inbox, Today, Upcoming, Anytime, Someday, Logbook.
- **[Assist Plus](https://github.com/jabaho9523/obsidian-assist-plus)** — Chat with Claude on your own API key, with strict control over what it sees and changes.

## License

0BSD
