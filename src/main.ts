import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, TasksPlusSettings } from "./settings";

export default class TasksPlusPlugin extends Plugin {
	settings!: TasksPlusSettings;

	async onload(): Promise<void> {
		await this.loadSettings();
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<TasksPlusSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...(loaded ?? {}) };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
