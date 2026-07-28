import {
	ItemView,
	TFile,
	TFolder,
	WorkspaceLeaf,
	setIcon,
} from "obsidian";
import TasksPlusPlugin from "../main";
import { PLUGIN_NAME, RIBBON_ICON, VIEW_TYPE_TASKS_PLUS, INBOX_BASENAME } from "../constants";
import { TaskItem } from "../model/index";
import {
	VIEW_ICONS,
	VIEW_IDS,
	VIEW_LABELS,
	ViewId,
	counts,
	effectiveDate,
	projectTasks,
	tasksFor,
} from "../model/queries";
import {
	moveTaskToFile,
	setTaskChecked,
	setTaskDue,
	toggleTaskSomeday,
	toggleTaskStar,
} from "../model/mutate";
import {
	addDays,
	formatDayHeading,
	formatHuman,
	formatMonthHeading,
	todayISO,
	toISO,
	parseISO,
} from "../util/date";
import { CaptureModal } from "../capture/modal";
import { DateModal } from "./date-picker";
import { ProjectPickerModal } from "./project-picker";
import { renderTaskRow } from "./rows";

type Selection = { kind: "view"; view: ViewId } | { kind: "project"; path: string };

const EMPTY_STATES: Record<ViewId, string> = {
	inbox: "Nothing to sort — your inbox is clear.",
	today: "Nothing due today. Enjoy the space.",
	upcoming: "Nothing scheduled ahead.",
	anytime: "No tasks waiting in your projects.",
	someday: "Nothing resting here.",
	logbook: "Completed tasks will gather here.",
};

export class TasksPlusView extends ItemView {
	private selection: Selection = { kind: "view", view: "inbox" };
	private cursor = 0;
	private rows: TaskItem[] = [];
	private today = todayISO();
	private unsubscribe: (() => void) | null = null;
	private dayTimer: number | null = null;

	constructor(
		leaf: WorkspaceLeaf,
		private plugin: TasksPlusPlugin
	) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE_TASKS_PLUS;
	}

	getDisplayText(): string {
		return PLUGIN_NAME;
	}

	getIcon(): string {
		return RIBBON_ICON;
	}

	onOpen(): Promise<void> {
		this.unsubscribe = this.plugin.index.onChange(() => this.render());
		this.dayTimer = window.setInterval(() => {
			const now = todayISO();
			if (now !== this.today) {
				this.today = now;
				this.render();
			}
		}, 60_000);
		this.contentEl.tabIndex = 0;
		this.registerDomEvent(this.contentEl, "keydown", (e) =>
			this.handleKey(e)
		);
		this.render();
		return Promise.resolve();
	}

	onClose(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = null;
		if (this.dayTimer !== null) {
			window.clearInterval(this.dayTimer);
			this.dayTimer = null;
		}
		this.contentEl.empty();
		return Promise.resolve();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("tasks-plus-view");
		const root = contentEl.createDiv({ cls: "tasks-plus-root" });
		this.renderRail(root.createDiv({ cls: "tasks-plus-rail" }));
		this.renderContent(root.createDiv({ cls: "tasks-plus-content" }));
	}

	private renderRail(rail: HTMLElement): void {
		const all = this.plugin.index.all();
		const viewCounts = counts(all, this.today);
		for (const id of VIEW_IDS) {
			const item = rail.createDiv({ cls: "tasks-plus-rail-item" });
			if (this.selection.kind === "view" && this.selection.view === id) {
				item.addClass("is-active");
			}
			const icon = item.createSpan({ cls: "tasks-plus-rail-icon" });
			setIcon(icon, VIEW_ICONS[id]);
			item.createSpan({ cls: "tasks-plus-rail-label", text: VIEW_LABELS[id] });
			if (viewCounts[id] > 0 && id !== "logbook") {
				item.createSpan({
					cls: "tasks-plus-rail-count",
					text: String(viewCounts[id]),
				});
			}
			item.addEventListener("click", () => {
				this.selection = { kind: "view", view: id };
				this.cursor = 0;
				this.render();
			});
		}
		this.renderTree(rail, all);
	}

	private renderTree(rail: HTMLElement, all: TaskItem[]): void {
		const folder = this.app.vault.getFolderByPath(this.plugin.index.tasksFolder());
		if (!folder) return;
		const hasProjects = folder.children.some(
			(c) =>
				c instanceof TFolder ||
				(c instanceof TFile &&
					c.extension === "md" &&
					c.basename !== INBOX_BASENAME)
		);
		if (!hasProjects) return;

		rail.createDiv({ cls: "tasks-plus-tree-heading", text: "Projects" });
		const openByPath = new Map<string, number>();
		for (const t of all) {
			if (!t.checked) {
				openByPath.set(t.path, (openByPath.get(t.path) ?? 0) + 1);
			}
		}
		this.renderTreeLevel(rail, folder, 0, openByPath);
	}

	private renderTreeLevel(
		rail: HTMLElement,
		folder: TFolder,
		depth: number,
		openByPath: Map<string, number>
	): void {
		const folders = folder.children
			.filter((c): c is TFolder => c instanceof TFolder)
			.sort((a, b) => a.name.localeCompare(b.name));
		const files = folder.children
			.filter(
				(c): c is TFile =>
					c instanceof TFile &&
					c.extension === "md" &&
					!(depth === 0 && c.basename === INBOX_BASENAME)
			)
			.sort((a, b) => a.basename.localeCompare(b.basename));

		for (const file of files) {
			const item = rail.createDiv({
				cls: `tasks-plus-tree-item tasks-plus-tree-depth-${Math.min(depth, 3)}`,
			});
			if (
				this.selection.kind === "project" &&
				this.selection.path === file.path
			) {
				item.addClass("is-active");
			}
			const icon = item.createSpan({ cls: "tasks-plus-rail-icon" });
			setIcon(icon, "file-text");
			item.createSpan({
				cls: "tasks-plus-rail-label",
				text: file.basename,
			});
			const open = openByPath.get(file.path) ?? 0;
			if (open > 0) {
				item.createSpan({
					cls: "tasks-plus-rail-count",
					text: String(open),
				});
			}
			item.addEventListener("click", () => {
				this.selection = { kind: "project", path: file.path };
				this.cursor = 0;
				this.render();
			});
		}
		for (const sub of folders) {
			rail.createDiv({
				cls: `tasks-plus-tree-area tasks-plus-tree-depth-${Math.min(depth, 3)}`,
				text: sub.name,
			});
			this.renderTreeLevel(rail, sub, depth + 1, openByPath);
		}
	}

	private renderContent(content: HTMLElement): void {
		const all = this.plugin.index.all();

		let title: string;
		let icon: string;
		if (this.selection.kind === "view") {
			this.rows = tasksFor(this.selection.view, all, this.today);
			title = VIEW_LABELS[this.selection.view];
			icon = VIEW_ICONS[this.selection.view];
		} else {
			this.rows = projectTasks(all, this.selection.path);
			title =
				this.selection.path.split("/").pop()?.replace(/\.md$/, "") ??
				this.selection.path;
			icon = "file-text";
		}
		this.cursor = Math.max(0, Math.min(this.cursor, this.rows.length - 1));

		const header = content.createDiv({ cls: "tasks-plus-header" });
		const headIcon = header.createSpan({ cls: "tasks-plus-header-icon" });
		setIcon(headIcon, icon);
		header.createSpan({ cls: "tasks-plus-header-title", text: title });
		if (this.rows.length > 0) {
			header.createSpan({
				cls: "tasks-plus-header-count",
				text: String(this.rows.length),
			});
		}
		const capture = header.createEl("button", {
			cls: "tasks-plus-icon-btn tasks-plus-header-add",
		});
		capture.setAttribute("aria-label", "Quick capture");
		setIcon(capture, "plus");
		capture.addEventListener("click", () => {
			new CaptureModal(this.app, this.plugin.settings).open();
		});

		const list = content.createDiv({ cls: "tasks-plus-list" });
		if (this.rows.length === 0) {
			const message =
				this.selection.kind === "view"
					? EMPTY_STATES[this.selection.view]
					: "No open tasks in this project.";
			list.createDiv({ cls: "tasks-plus-empty", text: message });
			return;
		}

		if (this.selection.kind === "view" && this.selection.view === "upcoming") {
			this.renderGrouped(list, groupUpcoming(this.rows, this.today));
		} else if (
			this.selection.kind === "view" &&
			this.selection.view === "logbook"
		) {
			this.renderGrouped(list, groupLogbook(this.rows, this.today));
		} else {
			for (const task of this.rows) this.renderRow(list, task);
		}
	}

	private renderGrouped(
		list: HTMLElement,
		groups: { label: string; tasks: TaskItem[] }[]
	): void {
		for (const group of groups) {
			list.createDiv({ cls: "tasks-plus-group-heading", text: group.label });
			for (const task of group.tasks) this.renderRow(list, task);
		}
	}

	private renderRow(list: HTMLElement, task: TaskItem): void {
		const index = this.rows.indexOf(task);
		const row = renderTaskRow(
			list,
			task,
			{
				selected: index === this.cursor,
				showSource: true,
				today: this.today,
			},
			{
				onToggle: (t) => void setTaskChecked(this.app, t, !t.checked),
				onStar: (t) => void toggleTaskStar(this.app, t),
				onSchedule: (t) => this.openScheduler(t),
				onSomeday: (t) => void toggleTaskSomeday(this.app, t),
				onMove: (t) => this.openMover(t),
				onJump: (t) => void this.jumpToSource(t),
				onSelect: (t) => {
					this.cursor = this.rows.indexOf(t);
					this.render();
				},
			}
		);
		row.setAttribute("data-task-index", String(index));
	}

	private handleKey(e: KeyboardEvent): void {
		const target = e.target as HTMLElement | null;
		if (
			e.metaKey ||
			e.ctrlKey ||
			e.altKey ||
			(target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA"))
		) {
			return;
		}
		const task = this.rows[this.cursor];
		switch (e.key) {
			case "j":
			case "ArrowDown":
				this.moveCursor(1);
				break;
			case "k":
			case "ArrowUp":
				this.moveCursor(-1);
				break;
			case "x":
				if (task) void setTaskChecked(this.app, task, !task.checked);
				break;
			case "t":
				if (task) void toggleTaskStar(this.app, task);
				break;
			case "s":
				if (task) this.openScheduler(task);
				break;
			default:
				return;
		}
		e.preventDefault();
	}

	private moveCursor(delta: number): void {
		if (this.rows.length === 0) return;
		this.cursor = Math.max(
			0,
			Math.min(this.rows.length - 1, this.cursor + delta)
		);
		this.render();
		this.contentEl
			.querySelector(`[data-task-index="${this.cursor}"]`)
			?.scrollIntoView({ block: "nearest" });
	}

	private openScheduler(task: TaskItem): void {
		new DateModal(
			this.app,
			task.due,
			this.plugin.settings.firstDayOfWeek,
			(iso) => void setTaskDue(this.app, task, iso)
		).open();
	}

	private openMover(task: TaskItem): void {
		new ProjectPickerModal(this.app, this.plugin.index.tasksFolder(), (file) => {
			void moveTaskToFile(this.app, task, file.path);
		}).open();
	}

	private async jumpToSource(task: TaskItem): Promise<void> {
		const file = this.app.vault.getFileByPath(task.path);
		if (!file) return;
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(file, { eState: { line: task.line } });
	}
}

function groupUpcoming(
	rows: TaskItem[],
	today: string
): { label: string; tasks: TaskItem[] }[] {
	const weekEnd = toISO(addDays(parseISO(today) ?? new Date(), 7));
	const groups: { key: string; label: string; tasks: TaskItem[] }[] = [];
	for (const task of rows) {
		const date = effectiveDate(task);
		if (!date) continue;
		const withinWeek = date <= weekEnd;
		const key = withinWeek ? date : date.slice(0, 7);
		const label = withinWeek
			? formatDayHeading(date, today)
			: formatMonthHeading(date);
		const last = groups[groups.length - 1];
		if (last && last.key === key) last.tasks.push(task);
		else groups.push({ key, label, tasks: [task] });
	}
	return groups;
}

function groupLogbook(
	rows: TaskItem[],
	today: string
): { label: string; tasks: TaskItem[] }[] {
	const groups: { key: string; label: string; tasks: TaskItem[] }[] = [];
	for (const task of rows) {
		const key = task.doneDate ?? "";
		const last = groups[groups.length - 1];
		if (last && last.key === key) {
			last.tasks.push(task);
		} else {
			groups.push({ key, label: formatHuman(key, today), tasks: [task] });
		}
	}
	return groups;
}
