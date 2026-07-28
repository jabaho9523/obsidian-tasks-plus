import { App, Notice, TFile, normalizePath } from "obsidian";
import { PLUGIN_NAME } from "../constants";
import { todayISO } from "../util/date";
import { TaskItem } from "./index";
import {
	setLineChecked,
	setLineDeadline,
	setLineDue,
	toggleLineStar,
	toggleLineSomeday,
} from "./parse";

/**
 * Every mutation edits exactly the task's source line, verified against
 * the indexed raw text first so a stale index can never clobber content.
 */
async function editTaskLine(
	app: App,
	task: TaskItem,
	transform: (raw: string) => string | null
): Promise<boolean> {
	const file = app.vault.getFileByPath(task.path);
	if (!file) {
		staleNotice();
		return false;
	}
	let ok = false;
	await app.vault.process(file, (content) => {
		const lines = content.split("\n");
		const current = lines[task.line];
		if (current === undefined) return content;
		const eol = current.endsWith("\r") ? "\r" : "";
		if (current.replace(/\r$/, "") !== task.raw) return content;
		const next = transform(task.raw);
		if (next === null) return content;
		lines[task.line] = next + eol;
		ok = true;
		return lines.join("\n");
	});
	if (!ok) staleNotice();
	return ok;
}

export function setTaskChecked(app: App, task: TaskItem, checked: boolean): Promise<boolean> {
	return editTaskLine(app, task, (raw) => setLineChecked(raw, checked, todayISO()));
}

export function setTaskDue(app: App, task: TaskItem, due: string | null): Promise<boolean> {
	return editTaskLine(app, task, (raw) => setLineDue(raw, due));
}

export function setTaskDeadline(
	app: App,
	task: TaskItem,
	deadline: string | null
): Promise<boolean> {
	return editTaskLine(app, task, (raw) => setLineDeadline(raw, deadline));
}

export function toggleTaskStar(app: App, task: TaskItem): Promise<boolean> {
	return editTaskLine(app, task, toggleLineStar);
}

export function toggleTaskSomeday(app: App, task: TaskItem): Promise<boolean> {
	return editTaskLine(app, task, toggleLineSomeday);
}

/** Remove the line from its source note and append it to the target note. */
export async function moveTaskToFile(
	app: App,
	task: TaskItem,
	targetPath: string
): Promise<boolean> {
	if (task.path === targetPath) return false;
	const source = app.vault.getFileByPath(task.path);
	if (!source) {
		staleNotice();
		return false;
	}
	let removed = false;
	await app.vault.process(source, (content) => {
		const lines = content.split("\n");
		const current = lines[task.line];
		if (current === undefined || current.replace(/\r$/, "") !== task.raw) {
			return content;
		}
		lines.splice(task.line, 1);
		removed = true;
		return lines.join("\n");
	});
	if (!removed) {
		staleNotice();
		return false;
	}
	const line = task.raw.replace(/^\s+/, "");
	const target = await ensureNote(app, targetPath);
	await appendLine(app, target, line);
	return true;
}

export async function ensureNote(app: App, path: string): Promise<TFile> {
	const normalized = normalizePath(path);
	const existing = app.vault.getFileByPath(normalized);
	if (existing) return existing;
	const parent = normalized.split("/").slice(0, -1).join("/");
	if (parent && !app.vault.getFolderByPath(parent)) {
		await app.vault.createFolder(parent).catch(() => {});
	}
	return app.vault.create(normalized, "");
}

export async function appendLine(app: App, file: TFile, line: string): Promise<void> {
	await app.vault.process(file, (content) => {
		if (content.length === 0) return `${line}\n`;
		const sep = content.endsWith("\n") ? "" : "\n";
		return `${content}${sep}${line}\n`;
	});
}

function staleNotice(): void {
	new Notice(`${PLUGIN_NAME}: the note changed underneath — try again`);
}
