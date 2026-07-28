import { App, FuzzySuggestModal, TFile, TFolder } from "obsidian";
import { INBOX_BASENAME } from "../constants";

/** Pick a destination note under the tasks folder (Inbox included). */
export class ProjectPickerModal extends FuzzySuggestModal<TFile> {
	constructor(
		app: App,
		private tasksFolder: string,
		private onPick: (file: TFile) => void
	) {
		super(app);
		this.setPlaceholder("Move to…");
	}

	getItems(): TFile[] {
		const root = this.app.vault.getFolderByPath(this.tasksFolder);
		if (!root) return [];
		const files: TFile[] = [];
		const visit = (folder: TFolder) => {
			for (const child of folder.children) {
				if (child instanceof TFolder) visit(child);
				else if (child instanceof TFile && child.extension === "md") {
					files.push(child);
				}
			}
		};
		visit(root);
		files.sort((a, b) => {
			const aInbox = a.basename === INBOX_BASENAME ? 0 : 1;
			const bInbox = b.basename === INBOX_BASENAME ? 0 : 1;
			return aInbox - bInbox || a.path.localeCompare(b.path);
		});
		return files;
	}

	getItemText(file: TFile): string {
		const rel = file.path.startsWith(`${this.tasksFolder}/`)
			? file.path.slice(this.tasksFolder.length + 1)
			: file.path;
		return rel.replace(/\.md$/, "");
	}

	onChooseItem(file: TFile): void {
		this.onPick(file);
	}
}
