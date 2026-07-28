const DUE_RE = /\u{1F4C5}️?\s*(\d{4}-\d{2}-\d{2})/u;
const SCHEDULED_RE = /\u{23F3}️?\s*(\d{4}-\d{2}-\d{2})/u;
const DONE_RE = /\u{2705}️?\s*(\d{4}-\d{2}-\d{2})/u;
const STAR_RE = /\u{2B50}️?/u;
const SOMEDAY_RE = /\u{1F4A4}️?/u;

const LINE_RE = /^(\s*)([-*+]|\d+[.)])\s+\[(.)\]\s?(.*)$/;

export interface ParsedTask {
	indent: string;
	bullet: string;
	statusChar: string;
	checked: boolean;
	/** Everything after the checkbox, untouched. */
	text: string;
	/** Text with the metadata markers stripped out. */
	title: string;
	due: string | null;
	scheduled: string | null;
	doneDate: string | null;
	starred: boolean;
	someday: boolean;
}

export function parseTaskLine(raw: string): ParsedTask | null {
	const m = LINE_RE.exec(raw);
	if (!m) return null;
	const indent = m[1] ?? "";
	const bullet = m[2] ?? "-";
	const statusChar = m[3] ?? " ";
	const text = m[4] ?? "";

	const due = DUE_RE.exec(text)?.[1] ?? null;
	const scheduled = SCHEDULED_RE.exec(text)?.[1] ?? null;
	const doneDate = DONE_RE.exec(text)?.[1] ?? null;
	const starred = STAR_RE.test(text);
	const someday = SOMEDAY_RE.test(text);

	const title = text
		.replace(new RegExp(` ?${DUE_RE.source}`, "u"), "")
		.replace(new RegExp(` ?${SCHEDULED_RE.source}`, "u"), "")
		.replace(new RegExp(` ?${DONE_RE.source}`, "u"), "")
		.replace(new RegExp(` ?${STAR_RE.source}`, "u"), "")
		.replace(new RegExp(` ?${SOMEDAY_RE.source}`, "u"), "")
		.replace(/\s+/g, " ")
		.trim();

	return {
		indent,
		bullet,
		statusChar,
		checked: statusChar !== " ",
		text,
		title,
		due,
		scheduled,
		doneDate,
		starred,
		someday,
	};
}

/** Build a fresh task line the way Tasks Plus writes them. */
export function buildTaskLine(title: string, due: string | null): string {
	return due ? `- [ ] ${title} \u{1F4C5} ${due}` : `- [ ] ${title}`;
}

export function setLineChecked(raw: string, checked: boolean, doneISO: string): string | null {
	const m = LINE_RE.exec(raw);
	if (!m) return null;
	const prefix = `${m[1] ?? ""}${m[2] ?? "-"} [${checked ? "x" : " "}]`;
	let text = m[4] ?? "";
	text = text.replace(new RegExp(` ?${DONE_RE.source}`, "u"), "");
	if (checked) text = `${text.replace(/\s+$/, "")} \u{2705} ${doneISO}`;
	return `${prefix} ${text}`.replace(/\s+$/, "");
}

export function setLineDue(raw: string, due: string | null): string | null {
	const m = LINE_RE.exec(raw);
	if (!m) return null;
	const prefix = `${m[1] ?? ""}${m[2] ?? "-"} [${m[3] ?? " "}]`;
	let text = m[4] ?? "";
	if (DUE_RE.test(text)) {
		text = due
			? text.replace(DUE_RE, `\u{1F4C5} ${due}`)
			: text.replace(new RegExp(` ?${DUE_RE.source}`, "u"), "");
	} else if (due) {
		text = `${text.replace(/\s+$/, "")} \u{1F4C5} ${due}`;
	}
	return `${prefix} ${text}`.replace(/\s+$/, "");
}

function toggleMarker(raw: string, markerRe: RegExp, marker: string): string | null {
	const m = LINE_RE.exec(raw);
	if (!m) return null;
	const prefix = `${m[1] ?? ""}${m[2] ?? "-"} [${m[3] ?? " "}]`;
	let text = m[4] ?? "";
	text = markerRe.test(text)
		? text.replace(new RegExp(` ?${markerRe.source}`, "u"), "")
		: `${text.replace(/\s+$/, "")} ${marker}`;
	return `${prefix} ${text}`.replace(/\s+$/, "");
}

export function toggleLineStar(raw: string): string | null {
	return toggleMarker(raw, STAR_RE, "\u{2B50}");
}

export function toggleLineSomeday(raw: string): string | null {
	return toggleMarker(raw, SOMEDAY_RE, "\u{1F4A4}");
}
