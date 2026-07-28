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

/**
 * Pull a date out of free text. The last date-like phrase wins
 * ("call mom tomorrow" → title "call mom", due tomorrow); a leading
 * "on"/"due" is cleaned away with it, while a leading "by"/"deadline"
 * makes it a deadline instead ("report by fri" → deadline Friday).
 */
export function parseNaturalDate(
	input: string,
	firstDayOfWeek: number,
	now: Date = new Date()
): NLResult {
	let best: { start: number; end: number; date: Date } | null = null;
	for (const matcher of MATCHERS) {
		matcher.re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = matcher.re.exec(input)) !== null) {
			const date = matcher.resolve(m, now, firstDayOfWeek);
			if (!date) continue;
			if (!best || m.index > best.start) {
				best = { start: m.index, end: m.index + m[0].length, date };
			}
		}
	}
	if (!best) {
		return { title: cleanTitle(input), due: null, deadline: null, phrase: null };
	}
	const rawBefore = input.slice(0, best.start);
	const isDeadline = /\b(?:by|deadline)\s*$/i.test(rawBefore);
	const before = rawBefore.replace(/\b(?:on|due|by|deadline)\s*$/i, "");
	const after = input.slice(best.end);
	const iso = toISO(best.date);
	return {
		title: cleanTitle(`${before} ${after}`),
		due: isDeadline ? null : iso,
		deadline: isDeadline ? iso : null,
		phrase: input.slice(best.start, best.end),
	};
}

function cleanTitle(text: string): string {
	return text.replace(/\s+/g, " ").replace(/[\s,;:—–-]+$/, "").trim();
}
