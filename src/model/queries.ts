import { TaskItem } from "./index";

export type ViewId =
	| "inbox"
	| "today"
	| "upcoming"
	| "anytime"
	| "someday"
	| "logbook";

export const VIEW_IDS: ViewId[] = [
	"inbox",
	"today",
	"upcoming",
	"anytime",
	"someday",
	"logbook",
];

export const VIEW_LABELS: Record<ViewId, string> = {
	inbox: "Inbox",
	today: "Today",
	upcoming: "Upcoming",
	anytime: "Anytime",
	someday: "Someday",
	logbook: "Logbook",
};

export const VIEW_ICONS: Record<ViewId, string> = {
	inbox: "inbox",
	today: "star",
	upcoming: "calendar-days",
	anytime: "layers",
	someday: "moon",
	logbook: "archive",
};

/** Earliest of due/scheduled/deadline — the date a task sorts and groups by. */
export function effectiveDate(t: TaskItem): string | null {
	const dates = [t.due, t.scheduled, t.deadline].filter(
		(d): d is string => d !== null
	);
	if (dates.length === 0) return null;
	return dates.reduce((a, b) => (a < b ? a : b));
}

/**
 * Every task lives in exactly one view. Precedence for open tasks:
 * someday > starred (Today) > date (Today/Upcoming) > Inbox/Anytime.
 * An Inbox task with a date or marker has been triaged — it leaves Inbox.
 */
export function primaryView(t: TaskItem, today: string): ViewId | null {
	if (t.checked) return t.doneDate !== null ? "logbook" : null;
	if (t.someday) return "someday";
	if (t.starred) return "today";
	const d = effectiveDate(t);
	if (d !== null) return d <= today ? "today" : "upcoming";
	return t.location === "inbox" ? "inbox" : "anytime";
}

export function tasksFor(view: ViewId, all: TaskItem[], today: string): TaskItem[] {
	const tasks = all.filter((t) => primaryView(t, today) === view);
	switch (view) {
		case "today":
		case "upcoming":
			return tasks.sort(byEffectiveDate);
		case "logbook":
			return tasks.sort(
				(a, b) =>
					(b.doneDate ?? "").localeCompare(a.doneDate ?? "") ||
					a.path.localeCompare(b.path) ||
					a.line - b.line
			);
		default:
			return tasks;
	}
}

export function projectTasks(all: TaskItem[], path: string): TaskItem[] {
	return all.filter((t) => !t.checked && t.path === path);
}

/** Open-task count per tag, for the rail. */
export function tagCounts(all: TaskItem[]): Map<string, number> {
	const counts = new Map<string, number>();
	for (const t of all) {
		if (t.checked) continue;
		for (const tag of t.tags) {
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}
	return counts;
}

/**
 * Tasks carrying every selected tag, grouped by their primary view in
 * rail order (Logbook included), each group sorted like its view.
 */
export function tagGroups(
	all: TaskItem[],
	tags: string[],
	today: string
): { view: ViewId; tasks: TaskItem[] }[] {
	const matching = all.filter((t) => tags.every((tag) => t.tags.includes(tag)));
	const groups: { view: ViewId; tasks: TaskItem[] }[] = [];
	for (const view of VIEW_IDS) {
		const tasks = tasksFor(view, matching, today);
		if (tasks.length > 0) groups.push({ view, tasks });
	}
	return groups;
}

export function counts(all: TaskItem[], today: string): Record<ViewId, number> {
	const out = {} as Record<ViewId, number>;
	for (const id of VIEW_IDS) out[id] = tasksFor(id, all, today).length;
	return out;
}

function byEffectiveDate(a: TaskItem, b: TaskItem): number {
	const da = effectiveDate(a);
	const db = effectiveDate(b);
	if (da !== db) {
		if (da === null) return 1;
		if (db === null) return -1;
		return da.localeCompare(db);
	}
	return a.path.localeCompare(b.path) || a.line - b.line;
}
