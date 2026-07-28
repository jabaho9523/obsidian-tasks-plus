const DAY_MS = 24 * 60 * 60 * 1000;

const MONTHS = [
	"Jan", "Feb", "Mar", "Apr", "May", "Jun",
	"Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTHS_FULL = [
	"January", "February", "March", "April", "May", "June",
	"July", "August", "September", "October", "November", "December",
];

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toISO(d: Date): string {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function todayISO(): string {
	return toISO(new Date());
}

export function parseISO(iso: string): Date | null {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!m) return null;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(d: Date): Date {
	const x = new Date(d);
	x.setHours(0, 0, 0, 0);
	return x;
}

export function addDays(d: Date, n: number): Date {
	const x = new Date(d);
	x.setDate(x.getDate() + n);
	return x;
}

export function addMonths(d: Date, n: number): Date {
	const x = new Date(d);
	x.setMonth(x.getMonth() + n);
	return x;
}

export function daysBetween(fromISO: string, untilISO: string): number {
	const a = parseISO(fromISO);
	const b = parseISO(untilISO);
	if (!a || !b) return 0;
	return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
}

/** "Today", "Tomorrow", "Fri, Aug 1" — with the year appended when it differs. */
export function formatHuman(iso: string, today: string = todayISO()): string {
	const d = parseISO(iso);
	if (!d) return iso;
	const diff = daysBetween(today, iso);
	if (diff === 0) return "Today";
	if (diff === 1) return "Tomorrow";
	if (diff === -1) return "Yesterday";
	const base = `${WEEKDAYS_SHORT[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
	const todayYear = parseISO(today)?.getFullYear();
	return d.getFullYear() === todayYear ? base : `${base} ${d.getFullYear()}`;
}

/** "Tomorrow", "Wednesday" … for the coming week; "Fri, Aug 1" beyond it. */
export function formatDayHeading(iso: string, today: string = todayISO()): string {
	const d = parseISO(iso);
	if (!d) return iso;
	const diff = daysBetween(today, iso);
	if (diff === 0) return "Today";
	if (diff === 1) return "Tomorrow";
	if (diff > 1 && diff <= 7) return WEEKDAYS[d.getDay()] ?? iso;
	return formatHuman(iso, today);
}

/** "August 2026" */
export function formatMonthHeading(iso: string): string {
	const d = parseISO(iso);
	if (!d) return iso;
	return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export function weekdayIndex(name: string): number {
	const n = name.toLowerCase();
	const table: Record<string, number> = {
		sunday: 0, sun: 0,
		monday: 1, mon: 1,
		tuesday: 2, tue: 2, tues: 2,
		wednesday: 3, wed: 3,
		thursday: 4, thu: 4, thur: 4, thurs: 4,
		friday: 5, fri: 5,
		saturday: 6, sat: 6,
	};
	return table[n] ?? -1;
}
