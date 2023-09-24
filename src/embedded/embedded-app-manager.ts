import {App, MarkdownView, TFile, WorkspaceLeaf} from "obsidian";
import {createApp, App as VueApp} from "vue";
import SimpleMindMap from "../mindmapvue/Main.vue";
import {FILE_EXTENSION,EVENT_APP_EMBEDDED_RESIZE} from "../constants/constant";

import {
    findEmbeddedLoomFile,
    getEmbeddedLoomLinkEls,
    getLinkWidth,
    getLinkHeight,
    hasLoadedEmbeddedLoom,
} from "./embed-utils";
/**
 * Iterates through all open markdown leaves and then iterates through all embedded loom links
 * for each leaf and renders a loom for each one.
 * This is intended to be used in the `on("layout-change")` callback function
 * @param markdownLeaves - The open markdown leaves
 */
export const loadPreviewModeApps = (
    app: App,
    markdownLeaves: WorkspaceLeaf[],
    manifestPluginVersion: string
) => {
    for (let i = 0; i < markdownLeaves.length; i++) {
        const leaf = markdownLeaves[i];

        const view = leaf.view as MarkdownView;
        const mode = view.getMode();

        if (mode === "preview")
            loadEmbeddedLoomApps(app, manifestPluginVersion, leaf, "preview");
    }
};

/**
 * Iterates through all embedded loom links and renders a Loom for each one.
 * Since a leaf can have an editing and reading view, we specify which child
 * to look in
 * @param markdownLeaf - The leaf that contains the markdown view
 * @param mode - The mode of the markdown view (source or preview)
 */
export const loadEmbeddedLoomApps = (
    app: App,
    manifestPluginVersion: string,
    markdownLeaf: WorkspaceLeaf,
    mode: "source" | "preview"
) => {
    const view = markdownLeaf.view as MarkdownView;
    const linkEls = getEmbeddedLoomLinkEls(view, mode);
    // debugger
    linkEls.forEach((linkEl) =>
        processLinkEl(app, manifestPluginVersion, markdownLeaf, linkEl, mode)
    );
};

/**
 * Removes embedded apps that are found in leaves that are no longer open
 * @param leaves - The open markdown leaves
 */
// export const purgeEmbeddedLoomApps = (leaves: WorkspaceLeaf[]) => {
// 	embeddedApps = embeddedApps.filter((app) =>
// 		leaves.find(
// 			(l) => (l.view as MarkdownView).file?.path === app.leafFilePath
// 		)
// 	);
// };

/**
 * Processes an embedded loom link
 * @param linkEl - The link element that contains the embedded loom
 * @param leaf - The leaf that contains the markdown view
 * @returns
 */
const processLinkEl = async (
    app: App,
    manifestPluginVersion: string,
    leaf: WorkspaceLeaf,
    linkEl: HTMLElement,
    mode: "source" | "preview"
) => {
    const DEFAULT_HEIGHT = '400px';
    const DEFAULT_WIDTH = '100%';
    //Set the width and height of the embedded loom
    //We do this first because if we have already loaded the loom, we stil want
    //the width and height of the embed to update if the user changes it

    // setLinkSize(linkEl);
    const src = linkEl.getAttribute("src");
    if (!src) {
        return;
    }
    if (!src.endsWith(FILE_EXTENSION)) {
        return;
    }
    //If the loom has already been loaded, we don't need to do anything else
    if (hasLoadedEmbeddedLoom(linkEl)) {
        //将mind的容器高度与挂载的dom保持一致，便于自定义高度
        if(!linkEl.find('#mindMapContainer')){
        	//mind的容器可能还没渲染好
        	return;
        }
        let containHeight=DEFAULT_HEIGHT;
        if(linkEl.getAttribute("height")!=null){
        	containHeight = linkEl.getAttribute("height")+"px";
        }
        // let containWidth=DEFAULT_WIDTH;
        // if(linkEl.getAttribute("width")!=null){
        // 	containWidth = linkEl.getAttribute("width")+"px";
        // }

        if(containHeight!==linkEl.find('#mindMapContainer').style.height
        	// || containWidth!==linkEl.find('#mindMapContainer').style.width
        	){
        	linkEl.find('#mindMapContainer').style.height=containHeight

        	// linkEl.style.width=containWidth
        	// linkEl.find('#mindMapContainer').style.width=containWidth
        	//TODO 通知remind容器尺寸发生了变化
        	app.workspace.trigger(EVENT_APP_EMBEDDED_RESIZE,leaf)
        }
        return;
    }


    const sourcePath = (leaf.view as MarkdownView).file?.path ?? "";
    const file = findEmbeddedLoomFile(app, linkEl, sourcePath);
    if (!file) return;

    resetLinkStyles(linkEl);

    //Create a container
    const containerEl = renderContainerEl(linkEl);

    let mindHeight = linkEl.getAttribute("height");
    // debugger;
    if (mindHeight === null || mindHeight === "0") {
        mindHeight = '400';
    }

    mindHeight += 'px';

    //Get the loom state
    const data = await app.vault.read(file);
    // debugger;
    // console.log(data)
    const mindContainerId = Math.random();
    const vm = createApp(SimpleMindMap, {
        leaf: leaf,
        mindContainerId: mindContainerId,
        mindFile: file,
        initMindData: JSON.parse(data),
        app: app,
        mode: 'embedded-edit',
        initElementHeight: mindHeight,
        showMiniMap: false,
        showMindTools: true,
        contentEl: containerEl
    }).mount(containerEl);
    const markMind = vm.$data.markMind;

}


/**
 * Creates a container for the embedded loom
 * This container has padding so that text doesn't touch the edges of the embed
 * @param linkEl - The link element that contains the embedded loom
 */
const renderContainerEl = (linkEl: HTMLElement) => {
    const containerEl = linkEl.createDiv({
        cls: "mufeng-mind-embedded-container",
    });
    // containerEl.style.height = "100%";
    // containerEl.style.width = "100%";
    // containerEl.style.height = "800px";
    containerEl.style.width = "100%";
    containerEl.style.padding = "10px 0px";

    //Stop propagation of the click event. We do this so that the embed link
    //doesn't navigate to the linked file when clicked
    containerEl.addEventListener("click", (e) => {
        e.stopPropagation();
    });
    return containerEl;
};

/**
 * Removes the default Obsidian styles from the link element
 * Obsidian by default will have a gray rectangle with padding and margin
 * @param linkEl - The link element that contains the embedded loom
 */
const resetLinkStyles = (linkEl: HTMLElement) => {
    //Clear default Obsidian placeholder content
    linkEl.empty();

    //Reset styles
    linkEl.style.backgroundColor = "var(--color-primary)";
    linkEl.style.cursor = "unset";
    linkEl.style.margin = "0px";
    linkEl.style.padding = "0px";
};

/**
 * Sets the link size based on the width and height attributes of the link
 * If no width or height is specified, the default width and height is used
 * @example
 * ![[filename.loom|300x300]]
 * //width: 300px
 * //height: 300px
 * @param linkEl - The link element that contains the embedded loom
 */
const setLinkSize = (linkEl: HTMLElement) => {
    // const { defaultEmbedWidth, defaultEmbedHeight } =
    // 	store.getState().global.settings;

    const width = getLinkWidth(linkEl, '100%');
    const height = getLinkHeight(linkEl, '100%');
    linkEl.style.width = width;
    linkEl.style.height = height;
};
