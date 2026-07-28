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

/** Earliest of due/scheduled — the date a task sorts and groups by. */
export function effectiveDate(t: TaskItem): string | null {
	if (t.due && t.scheduled) return t.due < t.scheduled ? t.due : t.scheduled;
	return t.due ?? t.scheduled;
}

export function tasksFor(view: ViewId, all: TaskItem[], today: string): TaskItem[] {
	switch (view) {
		case "inbox":
			return all.filter((t) => !t.checked && t.location === "inbox");
		case "today":
			return all
				.filter((t) => !t.checked && !t.someday)
				.filter((t) => {
					const d = effectiveDate(t);
					return t.starred || (d !== null && d <= today);
				})
				.sort(byEffectiveDate);
		case "upcoming":
			return all
				.filter((t) => !t.checked && !t.someday)
				.filter((t) => {
					const d = effectiveDate(t);
					return d !== null && d > today;
				})
				.sort(byEffectiveDate);
		case "anytime":
			return all.filter(
				(t) =>
					!t.checked &&
					!t.someday &&
					t.location !== "inbox" &&
					effectiveDate(t) === null
			);
		case "someday":
			return all.filter((t) => !t.checked && t.someday);
		case "logbook":
			return all
				.filter((t) => t.checked && t.doneDate !== null)
				.sort(
					(a, b) =>
						(b.doneDate ?? "").localeCompare(a.doneDate ?? "") ||
						a.path.localeCompare(b.path) ||
						a.line - b.line
				);
	}
}

export function projectTasks(all: TaskItem[], path: string): TaskItem[] {
	return all.filter((t) => !t.checked && t.path === path);
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
