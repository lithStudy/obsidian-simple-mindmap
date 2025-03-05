import { App, TFile, SuggestModal } from "obsidian";

export class FileSuggestModal extends SuggestModal<TFile> {
    constructor(app: App) {
        super(app);
    }

    getSuggestions(query: string): TFile[] {
        const files = this.app.vault.getFiles();
        return files.filter(file => 
            file.path.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(file: TFile, el: HTMLElement) {
        el.createEl("div", { text: file.path });
    }

    onChooseSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent): void {
        // 这个方法会被 Tools.vue 中的代码覆盖
    }
} 