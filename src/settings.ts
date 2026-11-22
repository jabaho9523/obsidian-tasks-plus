export interface TasksPlusSettings {
	tasksFolder: string;
	vaultWideTasks: boolean;
	firstDayOfWeek: number;
	dailyNoteBlock: boolean;
	showWhatsNew: boolean;
	/** Written by 0.2.0. Now only read, as the fallback when this device has stored no version */
	lastShownVersion?: string;
}

export const DEFAULT_SETTINGS: TasksPlusSettings = {
	tasksFolder: "Tasks",
	vaultWideTasks: true,
	firstDayOfWeek: 1,
	dailyNoteBlock: false,
	showWhatsNew: true,
};
