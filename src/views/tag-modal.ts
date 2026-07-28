import { App, Modal, setIcon } from "obsidian";
import { normalizeTag } from "../model/parse";

/**
 * One action per open: click a current tag to remove it, click a
 * suggestion or type a new tag and press Enter to add it.
 */
export class TagModal extends Modal {
	private inputEl!: HTMLInputElement;
	private suggestEl!: HTMLElement;

	constructor(
		app: App,
		private currentTags: string[],
		private vaultTags: string[],
		private onAdd: (tag: string) => void,
		private onRemove: (tag: string) => void
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("tasks-plus-tag-modal");
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle("Tags");

		if (this.currentTags.length > 0) {
			const current = contentEl.createDiv({ cls: "tasks-plus-tag-current" });
			for (const tag of this.currentTags) {
				const chip = current.createEl("button", {
					cls: "tasks-plus-tag-chip",
				});
				chip.createSpan({ text: `#${tag}` });
				const x = chip.createSpan({ cls: "tasks-plus-chip-icon" });
				setIcon(x, "x");
				chip.setAttribute("aria-label", `Remove #${tag}`);
				chip.addEventListener("click", () => {
					this.close();
					this.onRemove(tag);
				});
			}
		}

		this.inputEl = contentEl.createEl("input", {
			cls: "tasks-plus-tag-input",
			type: "text",
			placeholder: "Add a tag… #projecty",
		});
		this.suggestEl = contentEl.createDiv({ cls: "tasks-plus-tag-suggest" });

		this.inputEl.addEventListener("input", () => this.renderSuggestions());
		this.inputEl.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" || e.isComposing) return;
			e.preventDefault();
			const tag = normalizeTag(this.inputEl.value);
			if (tag) this.pick(tag);
		});
		this.renderSuggestions();
		this.inputEl.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private renderSuggestions(): void {
		const query = normalizeTag(this.inputEl.value).toLowerCase();
		this.suggestEl.empty();
		const candidates = this.vaultTags
			.filter((t) => !this.currentTags.includes(t))
			.filter((t) => !query || t.includes(query))
			.slice(0, 12);
		for (const tag of candidates) {
			const chip = this.suggestEl.createEl("button", {
				cls: "tasks-plus-tag-chip is-suggestion",
			});
			chip.createSpan({ text: `#${tag}` });
			chip.addEventListener("click", () => this.pick(tag));
		}
	}

	private pick(tag: string): void {
		this.close();
		this.onAdd(tag);
	}
}
