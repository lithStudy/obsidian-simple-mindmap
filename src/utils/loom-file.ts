import { App, Notice, normalizePath } from "obsidian";
import { createFile, createFolder } from "./file-operations";
import {DEFAULT_FILE_NAME, FILE_EXTENSION} from "../constants/constant";

export const createMindMapFile = async (
	app: App,
	folderPath: string,
	pluginVersion: string,
	defaultInitData:string
) => {
	try {
		await createFolderIfNotExists(app, folderPath);
		const filePath = getFilePath(folderPath);
		return await createFile(app, filePath, defaultInitData);
	} catch (err) {
		new Notice("Could not create mindMap file");
		throw err;
	}
};

const getFileName = (): string => {
	const fileName = DEFAULT_FILE_NAME;
	return `${fileName}.${FILE_EXTENSION}`;
};

const getFilePath = (folderPath: string) => {
	const fileName = getFileName();
	return normalizePath(folderPath + "/" + fileName);
};

const createFolderIfNotExists = async (app: App, folderPath: string) => {
	if (app.vault.getAbstractFileByPath(folderPath) == null)
		await createFolder(app, folderPath);
};
