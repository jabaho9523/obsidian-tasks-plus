import { Notice, ObsidianProtocolData, Plugin } from "obsidian";
import { PLUGIN_NAME } from "./constants";
import { DEFAULT_SETTINGS, TasksPlusSettings } from "./settings";
import { TaskIndex } from "./model/index";
import { CaptureModal, captureToInbox } from "./capture/modal";
import { formatHuman } from "./util/date";

export default class TasksPlusPlugin extends Plugin {
	settings!: TasksPlusSettings;
	index!: TaskIndex;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.index = new TaskIndex(this.app, () => this.settings);
		this.index.register(this);

		this.addCommand({
			id: "quick-capture",
			name: "Quick capture",
			callback: () => {
				new CaptureModal(this.app, this.settings).open();
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

		this.app.workspace.onLayoutReady(() => {
			void this.index.rebuildAll();
		});
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
