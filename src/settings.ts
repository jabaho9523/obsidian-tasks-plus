export interface TasksPlusSettings {
	tasksFolder: string;
	vaultWideTasks: boolean;
	firstDayOfWeek: number;
	dailyNoteBlock: boolean;
}

export const DEFAULT_SETTINGS: TasksPlusSettings = {
	tasksFolder: "Tasks",
	vaultWideTasks: true,
	firstDayOfWeek: 1,
	dailyNoteBlock: false,
};
