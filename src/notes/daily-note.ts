import { App, TFile, moment, normalizePath } from "obsidian";
import { BLOCK_END, BLOCK_START } from "../constants";
import { TaskItem } from "../model/index";
import { tasksFor } from "../model/queries";
import { formatHuman, todayISO } from "../util/date";

interface DailyNotesPluginSettings {
	folder?: string;
	format?: string;
	template?: string;
}

interface InternalPluginShape {
	enabled?: boolean;
	instance?: { options?: DailyNotesPluginSettings };
}

/**
 * Keep a managed <!-- tasks-plus:start/end --> block in today's daily
 * note listing Today's tasks. Same pattern as Meetings Plus. The block
 * renders plain bullets (not checkboxes) so it never gets re-indexed as
 * tasks — the source of truth stays the original lines.
 */
export async function updateDailyNote(app: App, all: TaskItem[]): Promise<void> {
	const file = await ensureDailyNote(app);
	if (!file) {
		console.warn(
			"[Tasks Plus] Daily note: could not find or create today's daily note"
		);
		return;
	}
	const today = todayISO();
	const tasks = tasksFor("today", all, today);
	const original = await app.vault.read(file);
	const next = replaceBlock(original, buildBlock(tasks, today));
	if (next !== original) {
		await app.vault.modify(file, next);
	}
}

/** Remove the managed block from today's daily note, if both exist. */
export async function clearDailyNote(app: App): Promise<void> {
	const path = dailyNotePath(app);
	if (!path) return;
	const file = app.vault.getFileByPath(path);
	if (!file) return;
	const original = await app.vault.read(file);
	const startIdx = original.indexOf(BLOCK_START);
	const endIdx = original.indexOf(BLOCK_END);
	if (startIdx < 0 || endIdx <= startIdx) return;
	const before = original.slice(0, startIdx).replace(/\n+$/, "\n");
	const after = original
		.slice(endIdx + BLOCK_END.length)
		.replace(/^\n+/, "\n");
	await app.vault.modify(file, `${before}${after}`.replace(/^\n/, ""));
}

function buildBlock(tasks: TaskItem[], today: string): string {
	const lines: string[] = [BLOCK_START, "## Today's tasks", ""];
	if (tasks.length === 0) {
		lines.push("- Nothing due today.");
	} else {
		for (const t of tasks) {
			const date = t.due ?? t.scheduled;
			const overdue =
				date && date < today ? ` (was due ${formatHuman(date, today)})` : "";
			lines.push(`- ${t.title}${overdue} · [[${t.basename}]]`);
		}
	}
	lines.push(BLOCK_END);
	return lines.join("\n");
}

function replaceBlock(content: string, block: string): string {
	const startIdx = content.indexOf(BLOCK_START);
	const endIdx = content.indexOf(BLOCK_END);
	if (startIdx >= 0 && endIdx > startIdx) {
		const before = content.slice(0, startIdx);
		const after = content.slice(endIdx + BLOCK_END.length);
		return `${before}${block}${after}`;
	}
	const sep = content.endsWith("\n") || content.length === 0 ? "" : "\n";
	return `${content}${sep}\n${block}\n`;
}

function dailyNotePath(app: App, date: Date = new Date()): string | null {
	const settings = getDailyNotesSettings(app);
	if (!settings) return null;
	const format = settings.format || "YYYY-MM-DD";
	const folder = (settings.folder ?? "").trim();
	const filename = moment(date).format(format);
	return normalizePath(folder ? `${folder}/${filename}.md` : `${filename}.md`);
}

async function ensureDailyNote(app: App): Promise<TFile | null> {
	const path = dailyNotePath(app);
	if (!path) return null;

	const existing = app.vault.getFileByPath(path);
	if (existing) return existing;

	const parent = path.split("/").slice(0, -1).join("/");
	if (parent && !app.vault.getFolderByPath(parent)) {
		try {
			await app.vault.createFolder(parent);
		} catch {
			/* ignore */
		}
	}

	try {
		return await app.vault.create(path, "");
	} catch {
		return null;
	}
}

function getDailyNotesSettings(app: App): DailyNotesPluginSettings | null {
	const internal = (
		app as unknown as {
			internalPlugins?: {
				plugins?: Record<string, InternalPluginShape>;
			};
		}
	).internalPlugins;
	const plugin = internal?.plugins?.["daily-notes"];
	if (!plugin?.enabled) return null;
	return plugin.instance?.options ?? {};
}
