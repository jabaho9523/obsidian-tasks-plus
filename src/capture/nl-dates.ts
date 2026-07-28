import { addDays, addMonths, toISO, weekdayIndex } from "../util/date";

export interface NLResult {
	title: string;
	due: string | null;
	/** Set instead of due when the phrase was led by "by"/"deadline". */
	deadline: string | null;
	/** The exact phrase that was read as a date, for preview UI. */
	phrase: string | null;
}

interface Matcher {
	re: RegExp;
	resolve: (m: RegExpExecArray, now: Date, firstDayOfWeek: number) => Date | null;
}

const WEEKDAY_WORDS =
	"monday|tuesday|wednesday|thursday|friday|saturday|sunday|tues|thurs|thur|mon|tue|wed|thu|fri|sat|sun";

const MATCHERS: Matcher[] = [
	{
		re: /\b(\d{4}-\d{2}-\d{2})\b/gi,
		resolve: (m) => {
			const parts = /(\d{4})-(\d{2})-(\d{2})/.exec(m[1] ?? "");
			if (!parts) return null;
			const d = new Date(
				Number(parts[1]),
				Number(parts[2]) - 1,
				Number(parts[3])
			);
			return Number.isNaN(d.getTime()) ? null : d;
		},
	},
	{
		re: /\b(?:today|tonight)\b/gi,
		resolve: (_m, now) => now,
	},
	{
		re: /\btomorrow\b/gi,
		resolve: (_m, now) => addDays(now, 1),
	},
	{
		re: /\bnext week\b/gi,
		resolve: (_m, now, firstDayOfWeek) => {
			let delta = (firstDayOfWeek - now.getDay() + 7) % 7;
			if (delta === 0) delta = 7;
			return addDays(now, delta);
		},
	},
	{
		re: new RegExp(`\\b(next\\s+)?(${WEEKDAY_WORDS})\\b`, "gi"),
		resolve: (m, now) => {
			const target = weekdayIndex(m[2] ?? "");
			if (target < 0) return null;
			let delta = (target - now.getDay() + 7) % 7;
			if (delta === 0) delta = 7;
			if (m[1]) delta += 7;
			return addDays(now, delta);
		},
	},
	{
		re: /\b(?:in\s+)?(\d+)\s*(days?|weeks?|months?|d|w|m)\b/gi,
		resolve: (m, now) => {
			const n = Number(m[1]);
			if (!Number.isFinite(n) || n <= 0) return null;
			const unit = (m[2] ?? "").charAt(0).toLowerCase();
			if (unit === "d") return addDays(now, n);
			if (unit === "w") return addDays(now, n * 7);
			if (unit === "m") return addMonths(now, n);
			return null;
		},
	},
];

interface Found {
	start: number;
	end: number;
	date: Date;
}

const DEADLINE_PREFIX_RE = /\b(?:by|deadline)\s*$/i;
const ANY_PREFIX_RE = /\b(?:on|due|by|deadline)\s*$/i;

/**
 * Pull dates out of free text. A phrase led by "by"/"deadline" becomes
 * the deadline; the last remaining phrase becomes the due date — both
 * can appear in one capture ("version test by fri in 2w"). Matched
 * phrases and their lead-in words are stripped from the title.
 */
export function parseNaturalDate(
	input: string,
	firstDayOfWeek: number,
	now: Date = new Date()
): NLResult {
	const found: Found[] = [];
	for (const matcher of MATCHERS) {
		matcher.re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = matcher.re.exec(input)) !== null) {
			const date = matcher.resolve(m, now, firstDayOfWeek);
			if (!date) continue;
			found.push({ start: m.index, end: m.index + m[0].length, date });
		}
	}
	found.sort((a, b) => a.start - b.start);

	let deadline: Found | null = null;
	for (const f of found) {
		if (DEADLINE_PREFIX_RE.test(input.slice(0, f.start))) deadline = f;
	}
	let due: Found | null = null;
	for (const f of found) {
		if (deadline && f.start < deadline.end && f.end > deadline.start) continue;
		if (DEADLINE_PREFIX_RE.test(input.slice(0, f.start))) continue;
		due = f;
	}

	if (!deadline && !due) {
		return { title: cleanTitle(input), due: null, deadline: null, phrase: null };
	}

	// Strip right-to-left so earlier spans keep their indices.
	const spans = [deadline, due]
		.filter((s): s is Found => s !== null)
		.sort((a, b) => b.start - a.start);
	let title = input;
	for (const s of spans) {
		const before = title.slice(0, s.start).replace(ANY_PREFIX_RE, "");
		title = `${before} ${title.slice(s.end)}`;
	}

	const last = due && (!deadline || due.start > deadline.start) ? due : deadline;
	return {
		title: cleanTitle(title),
		due: due ? toISO(due.date) : null,
		deadline: deadline ? toISO(deadline.date) : null,
		phrase: last ? input.slice(last.start, last.end) : null,
	};
}

function cleanTitle(text: string): string {
	return text.replace(/\s+/g, " ").replace(/[\s,;:—–-]+$/, "").trim();
}
