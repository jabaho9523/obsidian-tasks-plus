import { App, Modal, Notice, setIcon } from "obsidian";
import { PLUGIN_NAME } from "../constants";
import { TasksPlusSettings } from "../settings";
import { buildTaskLine } from "../model/parse";
import { appendLine, ensureNote } from "../model/mutate";
import { formatHuman } from "../util/date";
import { parseNaturalDate } from "./nl-dates";

/**
 * Append a captured task to Tasks/Inbox.md, extracting a natural-language
 * due date from the text. Returns what was written, or null for empty input.
 */
export async function captureToInbox(
	app: App,
	settings: TasksPlusSettings,
	rawText: string
): Promise<{ title: string; due: string | null } | null> {
	const parsed = parseNaturalDate(rawText, settings.firstDayOfWeek);
	if (!parsed.title) return null;
	const folder = settings.tasksFolder || "Tasks";
	const inbox = await ensureNote(app, `${folder}/Inbox.md`);
	await appendLine(app, inbox, buildTaskLine(parsed.title, parsed.due));
	return { title: parsed.title, due: parsed.due };
}

export class CaptureModal extends Modal {
	private inputEl!: HTMLInputElement;
	private previewEl!: HTMLElement;

	constructor(
		app: App,
		private settings: TasksPlusSettings
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("tasks-plus-capture-modal");
		const { contentEl } = this;
		contentEl.empty();

		this.inputEl = contentEl.createEl("input", {
			cls: "tasks-plus-capture-input",
			type: "text",
			placeholder: "New task… try “call mom tomorrow”",
		});
		this.previewEl = contentEl.createDiv({ cls: "tasks-plus-capture-preview" });

		this.inputEl.addEventListener("input", () => this.renderPreview());
		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key === "Enter" && !e.isComposing) {
				e.preventDefault();
				void this.commit();
			}
		});
		this.renderPreview();
		this.inputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderPreview(): void {
		const parsed = parseNaturalDate(
			this.inputEl.value,
			this.settings.firstDayOfWeek
		);
		this.previewEl.empty();
		if (!parsed.title) {
			this.previewEl.createSpan({
				cls: "tasks-plus-capture-hint",
				text: "Lands in your Inbox. Enter to save.",
			});
			return;
		}
		this.previewEl.createSpan({
			cls: "tasks-plus-capture-title",
			text: parsed.title,
		});
		if (parsed.due) {
			const chip = this.previewEl.createSpan({ cls: "tasks-plus-date-chip" });
			const icon = chip.createSpan({ cls: "tasks-plus-chip-icon" });
			setIcon(icon, "calendar");
			chip.createSpan({ text: formatHuman(parsed.due) });
		}
	}

	private async commit(): Promise<void> {
		const text = this.inputEl.value;
		try {
			const saved = await captureToInbox(this.app, this.settings, text);
			if (!saved) return;
			this.close();
			const due = saved.due ? ` · due ${formatHuman(saved.due)}` : "";
			new Notice(`Added to Inbox${due}`);
		} catch (e) {
			console.warn("[Tasks Plus] capture failed", e);
			new Notice(`${PLUGIN_NAME}: could not save the task`);
		}
	}
}
