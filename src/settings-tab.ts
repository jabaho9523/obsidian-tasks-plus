import {
	App,
	PluginSettingTab,
	Setting,
	SettingDefinitionItem,
	normalizePath,
	setIcon,
} from "obsidian";
import TasksPlusPlugin from "./main";
import { CAPTURE_URI_EXAMPLE } from "./constants";
import { DEFAULT_SETTINGS } from "./settings";
import { clearDailyNote } from "./notes/daily-note";
import { FolderSuggestModal } from "./views/folder-suggest";

export class TasksPlusSettingTab extends PluginSettingTab {
	plugin: TasksPlusPlugin;

	constructor(app: App, plugin: TasksPlusPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * Declarative definitions for the settings-search index (Obsidian 1.13+).
	 * Rendering still happens in display() because minAppVersion predates
	 * the declarative renderer; keys and defaults mirror the imperative UI.
	 */
	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Tasks folder",
				desc: "Where captured tasks live. Folders inside it are areas, notes are projects.",
				control: {
					type: "text",
					key: "tasksFolder",
					defaultValue: DEFAULT_SETTINGS.tasksFolder,
				},
			},
			{
				name: "Show tasks from the whole vault",
				desc: "Include checkboxes from any note, not just the tasks folder.",
				control: {
					type: "toggle",
					key: "vaultWideTasks",
					defaultValue: DEFAULT_SETTINGS.vaultWideTasks,
				},
			},
			{
				name: "First day of week",
				desc: "Used when parsing “next week”.",
				control: {
					type: "dropdown",
					key: "firstDayOfWeek",
					defaultValue: String(DEFAULT_SETTINGS.firstDayOfWeek),
					options: {
						"1": "Monday",
						"0": "Sunday",
					},
				},
			},
			{
				name: "Today's tasks in the daily note",
				desc: "Keep a managed block in today's daily note listing Today's tasks.",
				control: {
					type: "toggle",
					key: "dailyNoteBlock",
					defaultValue: DEFAULT_SETTINGS.dailyNoteBlock,
				},
			},
		];
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Tasks folder")
			.setDesc(
				"Where captured tasks live. Folders inside it are areas, notes are projects."
			)
			.addText((text) => {
				text.setPlaceholder(DEFAULT_SETTINGS.tasksFolder)
					.setValue(this.plugin.settings.tasksFolder)
					.onChange(async (value) => {
						this.plugin.settings.tasksFolder = normalizePath(
							value.trim() || DEFAULT_SETTINGS.tasksFolder
						);
						await this.plugin.saveSettings();
						void this.plugin.index.rebuildAll();
					});
			})
			.addExtraButton((btn) => {
				btn.setIcon("folder-open")
					.setTooltip("Pick a folder")
					.onClick(() => {
						new FolderSuggestModal(this.app, (path) => {
							this.plugin.settings.tasksFolder =
								path || DEFAULT_SETTINGS.tasksFolder;
							void this.plugin.saveSettings().then(() => {
								void this.plugin.index.rebuildAll();
								this.display();
							});
						}).open();
					});
			});

		new Setting(containerEl)
			.setName("Show tasks from the whole vault")
			.setDesc(
				"Include checkboxes from any note, not just the tasks folder. Editing a task always writes back to its source line."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.vaultWideTasks)
					.onChange(async (value) => {
						this.plugin.settings.vaultWideTasks = value;
						await this.plugin.saveSettings();
						void this.plugin.index.rebuildAll();
					});
			});

		new Setting(containerEl)
			.setName("First day of week")
			.setDesc("Used when parsing “next week”.")
			.addDropdown((dropdown) => {
				dropdown
					.addOption("1", "Monday")
					.addOption("0", "Sunday")
					.setValue(String(this.plugin.settings.firstDayOfWeek))
					.onChange(async (value) => {
						this.plugin.settings.firstDayOfWeek = value === "0" ? 0 : 1;
						await this.plugin.saveSettings();
					});
			});

		new Setting(containerEl)
			.setName("Today's tasks in the daily note")
			.setDesc(
				"Keep a managed block in today's daily note with everything due today. Removed again when you turn this off."
			)
			.addToggle((toggle) => {
				toggle
					.setValue(this.plugin.settings.dailyNoteBlock)
					.onChange(async (value) => {
						this.plugin.settings.dailyNoteBlock = value;
						await this.plugin.saveSettings();
						if (value) {
							await this.plugin.refreshDailyNote();
						} else {
							await clearDailyNote(this.app).catch(() => {});
						}
					});
			});

		const capture = new Setting(containerEl)
			.setName("Quick capture")
			.setDesc(
				"Assign a hotkey to the quick capture command to capture from anywhere in Obsidian. Capture from outside Obsidian with the link below."
			);
		const uri = capture.descEl.createDiv({ cls: "tasks-plus-capture-uri" });
		const icon = uri.createSpan({ cls: "tasks-plus-chip-icon" });
		setIcon(icon, "link");
		const code = uri.createEl("code");
		code.textContent = CAPTURE_URI_EXAMPLE;
	}
}
