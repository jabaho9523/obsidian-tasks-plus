export interface TasksPlusSettings {
	tasksFolder: string;
	vaultWideTasks: boolean;
	firstDayOfWeek: number;
	dailyNoteBlock: boolean;
	showWhatsNew: boolean;
	/** Version whose "What's new" was last shown; "" until the first load */
	lastShownVersion: string;
}

export const DEFAULT_SETTINGS: TasksPlusSettings = {
	tasksFolder: "Tasks",
	vaultWideTasks: true,
	firstDayOfWeek: 1,
	dailyNoteBlock: false,
	showWhatsNew: true,
	lastShownVersion: "",
};
