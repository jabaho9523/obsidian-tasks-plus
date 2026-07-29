import {
	App,
	CachedMetadata,
	Plugin,
	TFile,
	TFolder,
	debounce,
	normalizePath,
} from "obsidian";
import { BLOCK_END, BLOCK_START, INBOX_BASENAME } from "../constants";
import { TasksPlusSettings } from "../settings";
import { ParsedTask, parseTaskLine } from "./parse";

export type TaskLocation = "inbox" | "project" | "vault";

export interface TaskItem extends ParsedTask {
	path: string;
	basename: string;
	line: number;
	raw: string;
	location: TaskLocation;
	/** Folder under the tasks folder, e.g. "Work" for Tasks/Work/Website.md. */
	area: string | null;
	/** Note basename for project and vault tasks. */
	project: string | null;
}

/**
 * In-memory view over the vault's checkboxes, fed by Obsidian's
 * metadataCache. Never re-parses the vault wholesale after the initial
 * build; per-file updates ride the cache's "changed" event, debounced.
 */
export class TaskIndex {
	private byPath = new Map<string, TaskItem[]>();
	private listeners = new Set<() => void>();
	private notifyDebounced = debounce(() => this.notifyNow(), 200, true);

	constructor(
		private app: App,
		private getSettings: () => TasksPlusSettings
	) {}

	register(plugin: Plugin): void {
		plugin.registerEvent(
			this.app.metadataCache.on("changed", (file, data, cache) => {
				this.indexFile(file, data, cache);
				this.notifyDebounced();
			})
		);
		plugin.registerEvent(
			this.app.vault.on("delete", (file) => {
				if (this.byPath.delete(file.path)) this.notifyDebounced();
			})
		);
		plugin.registerEvent(
			this.app.vault.on("rename", (file, oldPath) => {
				this.byPath.delete(oldPath);
				if (file instanceof TFile) {
					const cache = this.app.metadataCache.getFileCache(file);
					if (cache) {
						void this.app.vault.cachedRead(file).then((data) => {
							this.indexFile(file, data, cache);
							this.notifyDebounced();
						});
					}
				}
				this.notifyDebounced();
			})
		);
	}

	async rebuildAll(): Promise<void> {
		this.byPath.clear();
		for (const file of this.indexableFiles()) {
			const cache = this.app.metadataCache.getFileCache(file);
			if (!cache?.listItems?.some((li) => li.task !== undefined)) continue;
			const data = await this.app.vault.cachedRead(file);
			this.indexFile(file, data, cache);
		}
		this.notifyNow();
	}

	/**
	 * With the vault-wide toggle off, only the tasks folder is walked —
	 * the plugin never enumerates the rest of the vault.
	 */
	private indexableFiles(): TFile[] {
		if (this.getSettings().vaultWideTasks) {
			return this.app.vault.getMarkdownFiles();
		}
		const root = this.app.vault.getFolderByPath(this.tasksFolder());
		if (!root) return [];
		const files: TFile[] = [];
		const visit = (folder: TFolder) => {
			for (const child of folder.children) {
				if (child instanceof TFolder) visit(child);
				else if (child instanceof TFile && child.extension === "md") {
					files.push(child);
				}
			}
		};
		visit(root);
		return files;
	}

	all(): TaskItem[] {
		const out: TaskItem[] = [];
		for (const items of this.byPath.values()) out.push(...items);
		out.sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line);
		return out;
	}

	onChange(cb: () => void): () => void {
		this.listeners.add(cb);
		return () => this.listeners.delete(cb);
	}

	tasksFolder(): string {
		return normalizePath(this.getSettings().tasksFolder || "Tasks");
	}

	inboxPath(): string {
		return `${this.tasksFolder()}/${INBOX_BASENAME}.md`;
	}

	private notifyNow(): void {
		for (const cb of this.listeners) cb();
	}

	private isIndexable(path: string): boolean {
		if (this.getSettings().vaultWideTasks) return true;
		return path.startsWith(`${this.tasksFolder()}/`);
	}

	private indexFile(file: TFile, data: string, cache: CachedMetadata): void {
		if (file.extension !== "md" || !this.isIndexable(file.path)) {
			this.byPath.delete(file.path);
			return;
		}
		const taskLines = (cache.listItems ?? []).filter(
			(li) => li.task !== undefined
		);
		if (taskLines.length === 0) {
			this.byPath.delete(file.path);
			return;
		}

		const lines = data.split("\n");
		const blocked = managedBlockLines(lines);
		const items: TaskItem[] = [];
		for (const li of taskLines) {
			const lineNo = li.position.start.line;
			if (blocked.has(lineNo)) continue;
			const raw = (lines[lineNo] ?? "").replace(/\r$/, "");
			const parsed = parseTaskLine(raw);
			if (!parsed) continue;
			items.push({
				...parsed,
				...this.classify(file.path),
				path: file.path,
				basename: file.basename,
				line: lineNo,
				raw,
			});
		}
		if (items.length > 0) {
			this.byPath.set(file.path, items);
		} else {
			this.byPath.delete(file.path);
		}
	}

	private classify(path: string): {
		location: TaskLocation;
		area: string | null;
		project: string | null;
	} {
		const folder = this.tasksFolder();
		const basename = path.replace(/\.md$/, "").split("/").pop() ?? path;
		if (path === this.inboxPath()) {
			return { location: "inbox", area: null, project: null };
		}
		if (path.startsWith(`${folder}/`)) {
			const rel = path.slice(folder.length + 1).replace(/\.md$/, "");
			const parts = rel.split("/");
			const area = parts.length > 1 ? parts.slice(0, -1).join("/") : null;
			return { location: "project", area, project: basename };
		}
		return { location: "vault", area: null, project: basename };
	}
}

/** Line numbers inside a tasks-plus managed block (daily-note render). */
function managedBlockLines(lines: string[]): Set<number> {
	const blocked = new Set<number>();
	let inBlock = false;
	for (let i = 0; i < lines.length; i++) {
		const line = (lines[i] ?? "").trim();
		if (line === BLOCK_START) inBlock = true;
		if (inBlock) blocked.add(i);
		if (line === BLOCK_END) inBlock = false;
	}
	return blocked;
}
