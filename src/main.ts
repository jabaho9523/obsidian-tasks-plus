import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TasksPlusSettings } from "./settings";
import { TaskIndex } from "./model/index";

export default class TasksPlusPlugin extends Plugin {
	settings!: TasksPlusSettings;
	index!: TaskIndex;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.index = new TaskIndex(this.app, () => this.settings);
		this.index.register(this);

		this.app.workspace.onLayoutReady(() => {
			void this.index.rebuildAll();
		});
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<TasksPlusSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
