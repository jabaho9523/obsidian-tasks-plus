const DUE_RE = /\u{1F4C5}️?\s*(\d{4}-\d{2}-\d{2})/u;
const SCHEDULED_RE = /\u{23F3}️?\s*(\d{4}-\d{2}-\d{2})/u;
const DEADLINE_RE = /\u{23F0}️?\s*(\d{4}-\d{2}-\d{2})/u;
const DONE_RE = /\u{2705}️?\s*(\d{4}-\d{2}-\d{2})/u;
const STAR_RE = /\u{2B50}️?/u;
const SOMEDAY_RE = /\u{1F4A4}️?/u;

const LINE_RE = /^(\s*)([-*+]|\d+[.)])\s+\[(.)\]\s?(.*)$/;
const TAG_RE = /#[\p{L}\p{N}_/-]*\p{L}[\p{L}\p{N}_/-]*/gu;
const BLOCK_ID_RE = /\s+\^([A-Za-z0-9-]+)\s*$/;

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
	deadline: string | null;
	doneDate: string | null;
	starred: boolean;
	someday: boolean;
	/** Inline #tags, lowercased, without the leading #. Kept in the title. */
	tags: string[];
	/** Trailing ^block-id, without the caret. Not part of the title. */
	blockId: string | null;
}

/** Obsidian only honours a block id when it is the last thing on the line. */
export function splitBlockId(text: string): { body: string; blockId: string | null } {
	const m = BLOCK_ID_RE.exec(text);
	if (!m) return { body: text, blockId: null };
	return { body: text.slice(0, m.index), blockId: m[1] ?? null };
}

function withBlockId(line: string, blockId: string | null): string {
	const trimmed = line.replace(/\s+$/, "");
	return blockId ? `${trimmed} ^${blockId}` : trimmed;
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
	const deadline = DEADLINE_RE.exec(text)?.[1] ?? null;
	const doneDate = DONE_RE.exec(text)?.[1] ?? null;
	const starred = STAR_RE.test(text);
	const someday = SOMEDAY_RE.test(text);
	const tags = Array.from(
		new Set((text.match(TAG_RE) ?? []).map((t) => t.slice(1).toLowerCase()))
	);

	const { body, blockId } = splitBlockId(text);
	const title = body
		.replace(new RegExp(` ?${DUE_RE.source}`, "u"), "")
		.replace(new RegExp(` ?${SCHEDULED_RE.source}`, "u"), "")
		.replace(new RegExp(` ?${DEADLINE_RE.source}`, "u"), "")
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
		deadline,
		doneDate,
		starred,
		someday,
		tags,
		blockId,
	};
}

/** Build a fresh task line the way Tasks Plus writes them. */
export function buildTaskLine(
	title: string,
	due: string | null,
	starred = false,
	someday = false,
	deadline: string | null = null
): string {
	let line = `- [ ] ${title}`;
	if (starred) line += " \u{2B50}";
	else if (someday) line += " \u{1F4A4}";
	if (due) line += ` \u{1F4C5} ${due}`;
	if (deadline) line += ` \u{23F0} ${deadline}`;
	return line;
}

export function setLineChecked(raw: string, checked: boolean, doneISO: string): string | null {
	const m = LINE_RE.exec(raw);
	if (!m) return null;
	const prefix = `${m[1] ?? ""}${m[2] ?? "-"} [${checked ? "x" : " "}]`;
	const { body, blockId } = splitBlockId(m[4] ?? "");
	let text = body;
	text = text.replace(new RegExp(` ?${DONE_RE.source}`, "u"), "");
	if (checked) text = `${text.replace(/\s+$/, "")} \u{2705} ${doneISO}`;
	return withBlockId(`${prefix} ${text}`, blockId);
}

function setLineDate(
	raw: string,
	dateRe: RegExp,
	emoji: string,
	date: string | null
): string | null {
	const m = LINE_RE.exec(raw);
	if (!m) return null;
	const prefix = `${m[1] ?? ""}${m[2] ?? "-"} [${m[3] ?? " "}]`;
	const { body, blockId } = splitBlockId(m[4] ?? "");
	let text = body;
	if (dateRe.test(text)) {
		text = date
			? text.replace(dateRe, `${emoji} ${date}`)
			: text.replace(new RegExp(` ?${dateRe.source}`, "u"), "");
	} else if (date) {
		text = `${text.replace(/\s+$/, "")} ${emoji} ${date}`;
	}
	return withBlockId(`${prefix} ${text}`, blockId);
}

export function setLineDue(raw: string, due: string | null): string | null {
	return setLineDate(raw, DUE_RE, "\u{1F4C5}", due);
}

export function setLineDeadline(raw: string, deadline: string | null): string | null {
	return setLineDate(raw, DEADLINE_RE, "\u{23F0}", deadline);
}

/** Star and someday are mutually exclusive — adding one clears the other. */
function toggleMarker(
	raw: string,
	markerRe: RegExp,
	marker: string,
	otherRe: RegExp
): string | null {
	const m = LINE_RE.exec(raw);
	if (!m) return null;
	const prefix = `${m[1] ?? ""}${m[2] ?? "-"} [${m[3] ?? " "}]`;
	const { body, blockId } = splitBlockId(m[4] ?? "");
	let text = body;
	if (markerRe.test(text)) {
		text = text.replace(new RegExp(` ?${markerRe.source}`, "u"), "");
	} else {
		text = text.replace(new RegExp(` ?${otherRe.source}`, "u"), "");
		text = `${text.replace(/\s+$/, "")} ${marker}`;
	}
	return withBlockId(`${prefix} ${text}`, blockId);
}

export function addLineTag(raw: string, tag: string): string | null {
	const clean = normalizeTag(tag);
	if (!clean) return null;
	const parsed = parseTaskLine(raw);
	if (!parsed) return null;
	if (parsed.tags.includes(clean.toLowerCase())) return raw;
	const { body, blockId } = splitBlockId(raw);
	return withBlockId(`${body.replace(/\s+$/, "")} #${clean}`, blockId);
}

export function removeLineTag(raw: string, tag: string): string | null {
	const clean = normalizeTag(tag);
	if (!clean) return null;
	const re = new RegExp(
		` ?#${clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_/-])`,
		"giu"
	);
	return raw.replace(re, "").replace(/\s+$/, "");
}

export function normalizeTag(tag: string): string {
	return tag.trim().replace(/^#+/, "").replace(/\s+/g, "-");
}

export function toggleLineStar(raw: string): string | null {
	return toggleMarker(raw, STAR_RE, "\u{2B50}", SOMEDAY_RE);
}

export function toggleLineSomeday(raw: string): string | null {
	return toggleMarker(raw, SOMEDAY_RE, "\u{1F4A4}", STAR_RE);
}
