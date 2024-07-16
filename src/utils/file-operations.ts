import { App, TFolder ,normalizePath} from "obsidian";
import { splitFileExtension } from "./utils";
import {DEFAULT_FILE_NAME, FILE_EXTENSION} from "../constants/constant";

export const createMindMapFile = async (
	app: App,
	folderPath: string,
	pluginVersion: string,
	defaultInitData:string,
	fileName:string
) => {
	try {
		await createFolderIfNotExists(app, folderPath);
		const filePath = getFilePath(folderPath,fileName);
		return await createFile(app, filePath, defaultInitData);
	} catch (err) {
		new Notice("Could not create mindMap file");
		throw err;
	}
};

const getFileName = (fileName:string): string => {
	if(!fileName){
		fileName = DEFAULT_FILE_NAME
	}
	return `${fileName}.${FILE_EXTENSION}`;
};

const getFilePath = (folderPath: string,fileName:string) => {
	const fileNameTemp = getFileName(fileName);
	return normalizePath(folderPath + "/" + fileNameTemp);
};

const createFolderIfNotExists = async (app: App, folderPath: string) => {
	if (app.vault.getAbstractFileByPath(folderPath) == null)
		await createFolder(app, folderPath);
};

export const createFolder = async (
	app: App,
	folderPath: string
): Promise<TFolder> => {
	return app.vault.createFolder(folderPath);
};

export const createFile = async (
	app: App,
	filePath: string,
	data: string,
	numExisting = 0
): Promise<string> => {
	try {
		const filePathExtension = splitFileExtension(filePath);
		if (filePathExtension == null)
			throw new SyntaxError("File must include an extension");

		const numIterations = numExisting > 0 ? " " + numExisting : "";
		const filePathWithIteration =
			filePathExtension[0] + numIterations + filePathExtension[1];
		await app.vault.create(filePathWithIteration, data);
		return filePathWithIteration;
	} catch (err: unknown) {
		const error = err as Error;

		if (error.message.includes("File already exists")) {
			return createFile(app, filePath, data, numExisting + 1);
		} else {
			throw err;
		}
	}
};

export const removeFileExtension =(fileName: string)=>{
	const lastDotIndex = fileName.lastIndexOf('.');
	if (lastDotIndex === -1) {
		return fileName; // 如果文件名中没有点号，则不包含后缀，直接返回原始文件名
	}
	return fileName.substring(0, lastDotIndex);
}
