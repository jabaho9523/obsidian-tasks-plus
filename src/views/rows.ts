import { setIcon } from "obsidian";
import { TaskItem } from "../model/index";
import { daysBetween, formatHuman } from "../util/date";

export interface RowCallbacks {
	onToggle: (task: TaskItem) => void;
	onStar: (task: TaskItem) => void;
	onSchedule: (task: TaskItem) => void;
	onDeadline: (task: TaskItem) => void;
	onSomeday: (task: TaskItem) => void;
	onTag: (task: TaskItem) => void;
	onJump: (task: TaskItem) => void;
	onSelect: (task: TaskItem) => void;
}

export interface RowOptions {
	selected: boolean;
	showSource: boolean;
	today: string;
}

export function renderTaskRow(
	parent: HTMLElement,
	task: TaskItem,
	opts: RowOptions,
	cb: RowCallbacks
): HTMLElement {
	const row = parent.createDiv({ cls: "tasks-plus-row" });
	if (opts.selected) row.addClass("is-selected");
	if (task.checked) row.addClass("is-done");

	const check = row.createEl("input", {
		cls: "tasks-plus-row-check",
		type: "checkbox",
	});
	check.checked = task.checked;
	check.setAttribute("aria-label", task.checked ? "Mark not done" : "Mark done");
	check.addEventListener("click", (e) => {
		e.stopPropagation();
		cb.onToggle(task);
	});

	const main = row.createDiv({ cls: "tasks-plus-row-main" });
	const titleEl = main.createDiv({ cls: "tasks-plus-row-title" });
	if (task.starred) {
		const star = titleEl.createSpan({ cls: "tasks-plus-row-star" });
		setIcon(star, "star");
	}
	titleEl.createSpan({ text: task.title || "(untitled)" });
	if (task.someday) {
		const moon = titleEl.createSpan({ cls: "tasks-plus-row-someday" });
		setIcon(moon, "moon");
	}

	const meta = main.createDiv({ cls: "tasks-plus-row-meta" });
	const date = task.checked ? task.doneDate : (task.due ?? task.scheduled);
	if (date) {
		const chip = meta.createSpan({ cls: "tasks-plus-date-chip" });
		if (!task.checked && date < opts.today) chip.addClass("is-overdue");
		const icon = chip.createSpan({ cls: "tasks-plus-chip-icon" });
		setIcon(icon, task.checked ? "check" : "calendar");
		chip.createSpan({ text: formatHuman(date, opts.today) });
	}
	if (!task.checked && task.deadline) {
		const chip = meta.createSpan({
			cls: "tasks-plus-date-chip is-deadline",
		});
		if (daysBetween(opts.today, task.deadline) <= 3) chip.addClass("is-urgent");
		const icon = chip.createSpan({ cls: "tasks-plus-chip-icon" });
		setIcon(icon, "alarm-clock");
		chip.createSpan({ text: formatHuman(task.deadline, opts.today) });
	}
	if (opts.showSource) {
		const source = meta.createSpan({
			cls: "tasks-plus-row-source",
			text: task.project ?? task.basename,
		});
		source.setAttribute("aria-label", `Open ${task.basename}`);
		source.addEventListener("click", (e) => {
			e.stopPropagation();
			cb.onJump(task);
		});
	}

	const actions = row.createDiv({ cls: "tasks-plus-row-actions" });
	actionButton(actions, "star", task.starred ? "Unstar" : "Star for Today", () =>
		cb.onStar(task)
	);
	actionButton(actions, "calendar", "Set date", () => cb.onSchedule(task));
	actionButton(actions, "alarm-clock", "Set deadline", () =>
		cb.onDeadline(task)
	);
	actionButton(
		actions,
		"moon",
		task.someday ? "Wake from Someday" : "Move to Someday",
		() => cb.onSomeday(task)
	);
	actionButton(actions, "tag", "Tags", () => cb.onTag(task));
	actionButton(actions, "arrow-up-right", "Open source note", () =>
		cb.onJump(task)
	);

	row.addEventListener("click", () => cb.onSelect(task));
	return row;
}

function actionButton(
	parent: HTMLElement,
	icon: string,
	label: string,
	onClick: () => void
): void {
	const btn = parent.createEl("button", { cls: "tasks-plus-icon-btn" });
	btn.setAttribute("aria-label", label);
	setIcon(btn, icon);
	btn.addEventListener("click", (e) => {
		e.stopPropagation();
		onClick();
	});
}
