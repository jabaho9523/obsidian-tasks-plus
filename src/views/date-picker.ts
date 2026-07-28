import { App, Modal, setIcon } from "obsidian";
import { formatHuman, todayISO, toISO, addDays } from "../util/date";
import { parseNaturalDate } from "../capture/nl-dates";

/** Mini date picker: quick options, a natural-language field, and a native date input. */
export class DateModal extends Modal {
	constructor(
		app: App,
		private current: string | null,
		private firstDayOfWeek: number,
		private onPick: (iso: string | null) => void
	) {
		super(app);
	}

	onOpen(): void {
		this.modalEl.addClass("tasks-plus-date-modal");
		const { contentEl } = this;
		contentEl.empty();
		this.setTitle("When?");

		const quick = contentEl.createDiv({ cls: "tasks-plus-date-quick" });
		this.quickButton(quick, "Today", todayISO());
		this.quickButton(quick, "Tomorrow", toISO(addDays(new Date(), 1)));
		const nextWeek = parseNaturalDate("next week", this.firstDayOfWeek).due;
		if (nextWeek) this.quickButton(quick, "Next week", nextWeek);
		if (this.current) {
			const clear = quick.createEl("button", {
				cls: "tasks-plus-date-quick-btn is-clear",
				text: "Clear date",
			});
			clear.addEventListener("click", () => this.pick(null));
		}

		const nlWrap = contentEl.createDiv({ cls: "tasks-plus-date-nl" });
		const nlInput = nlWrap.createEl("input", {
			type: "text",
			placeholder: "fri, in 2w, 2026-08-15…",
		});
		const nlPreview = nlWrap.createSpan({ cls: "tasks-plus-date-nl-preview" });
		nlInput.addEventListener("input", () => {
			const due = parseNaturalDate(nlInput.value, this.firstDayOfWeek).due;
			nlPreview.setText(due ? formatHuman(due) : "");
		});
		nlInput.addEventListener("keydown", (e) => {
			if (e.key !== "Enter" || e.isComposing) return;
			e.preventDefault();
			const due = parseNaturalDate(nlInput.value, this.firstDayOfWeek).due;
			if (due) this.pick(due);
		});

		const nativeWrap = contentEl.createDiv({ cls: "tasks-plus-date-native" });
		const icon = nativeWrap.createSpan({ cls: "tasks-plus-chip-icon" });
		setIcon(icon, "calendar");
		const native = nativeWrap.createEl("input", { type: "date" });
		if (this.current) native.value = this.current;
		native.addEventListener("change", () => {
			if (native.value) this.pick(native.value);
		});

		nlInput.focus();
	}

	onClose(): void {
		this.contentEl.empty();
	}

	private quickButton(parent: HTMLElement, label: string, iso: string): void {
		const btn = parent.createEl("button", {
			cls: "tasks-plus-date-quick-btn",
			text: label,
		});
		btn.addEventListener("click", () => this.pick(iso));
	}

	private pick(iso: string | null): void {
		this.close();
		this.onPick(iso);
	}
}
