// import {
// 	getWikiLinkText,
// 	stripDirectory,
// 	stripFileExtension,
// } from "src/shared/link/link-utils";
import {EXTENSION_REGEX, WIKI_LINK_REGEX} from "../constants/constant";
import {getWikiLinkText, stripDirectory, stripFileExtension} from "./link-utils";
import {TFile} from "obsidian";
import {App} from "obsidian";
export const splitFileExtension = (
	filePath: string
): [string, string] | null => {
	if (filePath.match(EXTENSION_REGEX)) {
		const periodIndex = filePath.lastIndexOf(".");
		return [
			filePath.substring(0, periodIndex),
			filePath.substring(periodIndex),
		];
	}
	return null;
};

export const updateLinkReferences = (
	markdown: string,
	newPath: string,
	oldPath: string
) => {
	//Create a replace function for the markdown
	return markdown.replace(WIKI_LINK_REGEX, (match, path) => {
		//The path may or may not contain a file extension
		//It also may or may not contain a slash, depending on if its a relative or absolute path
		let comparePath = oldPath;
		if (!path.includes("/")) comparePath = stripDirectory(comparePath);

		if (!path.match(EXTENSION_REGEX))
			comparePath = stripFileExtension(comparePath);

		if (comparePath === path) {
			const linkText = getWikiLinkText(newPath);
			return `[[${linkText}]]`;
		}
		return match;
	});
};

export const dateToString = (date: Date): string => {
	const year = date.getFullYear();
	const month = ("0" + (date.getMonth() + 1)).slice(-2);
	const day = ("0" + date.getDate()).slice(-2);
	return `${year}/${month}/${day}`;
};

export const pxToNum = (value: string) => {
	return parseFloat(value.split("px")[0]);
};

export const numToPx = (value: number | string) => {
	return `${value}px`;
};


export const openFile = (props: { file: TFile; app: App; newLeaf: boolean; leafBySplit?: boolean }) => {
	// debugger
	const { file, app, newLeaf, leafBySplit } = props;
	// let leaf = app.workspace.getLeaf(newLeaf);
	// if (leafBySplit) leaf = app.workspace.createLeafBySplit(leaf, 'vertical');
	// app.workspace.setActiveLeaf(leaf, false);
	// leaf.openFile(file, { eState: { focus: true } });

	let myLeaf = app.workspace.getLeaf(newLeaf);
	//新创建分屏打开
	if (leafBySplit) {
		myLeaf = app.workspace.createLeafBySplit(myLeaf, 'vertical');
		app.workspace.setActiveLeaf(myLeaf, {focus:false});
	}


	let result = false;
	app.workspace.iterateAllLeaves((leaf) => {
		const viewState = leaf.getViewState();
		if (viewState.state?.file === file.path) {
			app.workspace.setActiveLeaf(leaf);
			result = true;
		}
	});

	// If we have a "New Tab" tab open, just switch to that and let
	// 优先以空tab打开文件
	const emptyLeaves = app.workspace.getLeavesOfType("empty");
	if (emptyLeaves.length > 0) {
		app.workspace.setActiveLeaf(emptyLeaves[0]);
		emptyLeaves[0].openFile(file, { eState: { focus: true } });
		return;
	}

	if (!result) {
		//event.stopPropagation(); // This might break something...
		app.workspace.openLinkText(file.path, file.path, true);
		return;
	}

};

export function generateUniqueId(): string {
    return Math.random().toString(36).substring(2);
}
