import {
	Notice,
	ObsidianProtocolData,
	Plugin,
	WorkspaceLeaf,
	debounce,
} from "obsidian";
import { PLUGIN_NAME, RIBBON_ICON, VIEW_TYPE_TASKS_PLUS } from "./constants";
import { DEFAULT_SETTINGS, TasksPlusSettings } from "./settings";
import { TasksPlusSettingTab } from "./settings-tab";
import { TaskIndex } from "./model/index";
import { CaptureModal, captureToInbox } from "./capture/modal";
import { TasksPlusView } from "./views/leaf";
import { updateDailyNote } from "./notes/daily-note";
import { formatHuman } from "./util/date";

export default class TasksPlusPlugin extends Plugin {
	settings!: TasksPlusSettings;
	index!: TaskIndex;

	private dailyNoteRefresh = debounce(
		() => void this.refreshDailyNote(),
		2000,
		true
	);

	async onload(): Promise<void> {
		await this.loadSettings();

		this.index = new TaskIndex(this.app, () => this.settings);
		this.index.register(this);

		this.registerView(
			VIEW_TYPE_TASKS_PLUS,
			(leaf: WorkspaceLeaf) => new TasksPlusView(leaf, this)
		);

		this.addRibbonIcon(RIBBON_ICON, `Open ${PLUGIN_NAME}`, () => {
			void this.activateView(false);
		});

		this.addCommand({
			id: "quick-capture",
			name: "Quick capture",
			callback: () => {
				new CaptureModal(this.app, this.settings).open();
			},
		});

		this.addCommand({
			id: "insert-task",
			name: "Insert task",
			editorCallback: (editor) => {
				new CaptureModal(this.app, this.settings, (line) => {
					const cursor = editor.getCursor();
					const current = editor.getLine(cursor.line);
					if (current.trim() === "") {
						editor.setLine(cursor.line, line);
						editor.setCursor({ line: cursor.line, ch: line.length });
					} else {
						editor.replaceRange(`\n${line}`, {
							line: cursor.line,
							ch: current.length,
						});
						editor.setCursor({
							line: cursor.line + 1,
							ch: line.length,
						});
					}
				}).open();
			},
		});

		this.addCommand({
			id: "open-sidebar",
			name: "Open in sidebar",
			callback: () => {
				void this.activateView(false);
			},
		});

		this.addCommand({
			id: "open-tab",
			name: "Open as tab",
			callback: () => {
				void this.activateView(true);
			},
		});

		// obsidian://tasks-plus/capture?text=… — registered under both
		// action spellings so the URI works however Obsidian parses the path.
		const uriCapture = (params: ObsidianProtocolData) => {
			const text = typeof params.text === "string" ? params.text : "";
			void this.captureFromUri(text);
		};
		this.registerObsidianProtocolHandler("tasks-plus/capture", uriCapture);
		this.registerObsidianProtocolHandler("tasks-plus", uriCapture);

		this.addSettingTab(new TasksPlusSettingTab(this.app, this));

		this.index.onChange(() => this.dailyNoteRefresh());

		this.app.workspace.onLayoutReady(() => {
			void this.index.rebuildAll();
		});
	}

	async refreshDailyNote(): Promise<void> {
		if (!this.settings.dailyNoteBlock) return;
		try {
			await updateDailyNote(this.app, this.index.all());
		} catch (e) {
			console.warn("[Tasks Plus] daily note update failed", e);
		}
	}

	async activateView(asTab: boolean): Promise<void> {
		const { workspace } = this.app;
		const existing = workspace.getLeavesOfType(VIEW_TYPE_TASKS_PLUS);
		const first = existing[0];
		if (first) {
			void workspace.revealLeaf(first);
			return;
		}
		const leaf = asTab
			? workspace.getLeaf(true)
			: (workspace.getRightLeaf(false) ?? workspace.getLeaf(true));
		await leaf.setViewState({ type: VIEW_TYPE_TASKS_PLUS, active: true });
		void workspace.revealLeaf(leaf);
	}

	private async captureFromUri(text: string): Promise<void> {
		if (!text.trim()) {
			new CaptureModal(this.app, this.settings).open();
			return;
		}
		try {
			const saved = await captureToInbox(this.app, this.settings, text);
			if (!saved) return;
			const due = saved.due ? ` · due ${formatHuman(saved.due)}` : "";
			new Notice(`Added to Inbox${due}`);
		} catch (e) {
			console.warn("[Tasks Plus] URI capture failed", e);
			new Notice(`${PLUGIN_NAME}: could not save the task`);
		}
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<TasksPlusSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
