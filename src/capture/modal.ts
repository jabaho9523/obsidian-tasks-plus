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
	rawText: string,
	starred = false,
	someday = false
): Promise<{ title: string; due: string | null } | null> {
	const parsed = parseNaturalDate(rawText, settings.firstDayOfWeek);
	if (!parsed.title) return null;
	const folder = settings.tasksFolder || "Tasks";
	const inbox = await ensureNote(app, `${folder}/Inbox.md`);
	await appendLine(
		app,
		inbox,
		buildTaskLine(parsed.title, parsed.due, starred, someday)
	);
	return { title: parsed.title, due: parsed.due };
}

/**
 * Quick-capture modal. Without onInsert the task is appended to the
 * Inbox; with it, the built task line is handed to the caller (used by
 * the insert-task editor command to drop the line at the cursor).
 */
export class CaptureModal extends Modal {
	private inputEl!: HTMLInputElement;
	private previewEl!: HTMLElement;
	private starred = false;
	private someday = false;
	private starBtn!: HTMLButtonElement;
	private somedayBtn!: HTMLButtonElement;

	constructor(
		app: App,
		private settings: TasksPlusSettings,
		private onInsert?: (line: string) => void
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

		const row = contentEl.createDiv({ cls: "tasks-plus-capture-row" });
		this.previewEl = row.createDiv({ cls: "tasks-plus-capture-preview" });
		const marks = row.createDiv({ cls: "tasks-plus-capture-marks" });
		this.starBtn = this.markButton(marks, "star", "Star for Today", () => {
			this.starred = !this.starred;
			if (this.starred) this.someday = false;
			this.renderPreview();
		});
		this.somedayBtn = this.markButton(marks, "moon", "Someday", () => {
			this.someday = !this.someday;
			if (this.someday) this.starred = false;
			this.renderPreview();
		});

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

	private markButton(
		parent: HTMLElement,
		icon: string,
		label: string,
		onClick: () => void
	): HTMLButtonElement {
		const btn = parent.createEl("button", { cls: "tasks-plus-icon-btn" });
		btn.setAttribute("aria-label", label);
		setIcon(btn, icon);
		btn.addEventListener("click", onClick);
		return btn;
	}

	private renderPreview(): void {
		this.starBtn.toggleClass("is-active", this.starred);
		this.somedayBtn.toggleClass("is-active", this.someday);
		const parsed = parseNaturalDate(
			this.inputEl.value,
			this.settings.firstDayOfWeek
		);
		this.previewEl.empty();
		if (!parsed.title) {
			this.previewEl.createSpan({
				cls: "tasks-plus-capture-hint",
				text: this.onInsert
					? "Inserted at the cursor. Enter to save."
					: "Lands in your Inbox. Enter to save.",
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
			if (this.onInsert) {
				const parsed = parseNaturalDate(text, this.settings.firstDayOfWeek);
				if (!parsed.title) return;
				this.close();
				this.onInsert(
					buildTaskLine(parsed.title, parsed.due, this.starred, this.someday)
				);
				return;
			}
			const saved = await captureToInbox(
				this.app,
				this.settings,
				text,
				this.starred,
				this.someday
			);
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
