import {PluginValue, ViewPlugin, ViewUpdate} from "@codemirror/view";

// import {loadEmbeddedMindApps} from "./embedded/embedded-app-manager";
import {App, MarkdownView, WorkspaceLeaf} from "obsidian";
import {App as VueApp,createApp} from "vue";
import {
    EVENT_APP_CSS_CHANGE,
    EVENT_APP_MIND_EMBEDDED_RESIZE,
    EVENT_APP_LEAF_CHANGE_ACTIVE, EVENT_APP_MIND_EXPORT,
    EVENT_MIND_NODE_ACTIVE,
    EVENT_APP_MIND_NODE_REMARK_PREVIEW, EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE, EVENT_APP_MIND_NODE_PRIORITY,
    EVENT_APP_QUICK_PREVIEW,
    EVENT_APP_MIND_REFRESH,
    EVENT_APP_RESIZE, FILE_EXTENSION
} from "./constants/constant";
import {findEmbeddedMindFile, getEmbeddedLoomLinkEls, hasLoadedEmbeddedMind} from "./embedded/embed-utils";
import SimpleMindMap from "./mindmapvue/Main.vue";
import {MUFENG_MARKMIND_VIEW} from "./mindmap-edit-view";
import {openFile} from "./utils/utils";

export default function PreviewPlugin(
    app: App,
    manifestPluginVersion: string
) {
    return ViewPlugin.fromClass(
        /**
         * This plugin is responsible for rendering the mind in live preview mode.
         * It is instantiated for each open leaf
         */
        class EditingViewPlugin implements PluginValue {
            //记录创建的mind实例，将来卸载
            private mindAppList:VueApp<Element>[] =[]
            /**
             * Called whenever the markdown of the current leaf is updated.
             */
            update(update: ViewUpdate) {
                // debugger
                const markdownLeaves =
                    app.workspace.getLeavesOfType("markdown");
                const activeLeaf = markdownLeaves.find(
                    //@ts-expect-error - private property
                    (leaf) => leaf.view.editor.cm === update.view
                );
                if (!activeLeaf) return;
                this.loadEmbeddedMindApps(
                    manifestPluginVersion,
                    activeLeaf,
                    "source"
                );
            }

            destroy() {
                console.log("embedded destory")
                if (this.mindAppList.length > 0) {
                    for (const item of this.mindAppList) {
                        console.log("embedded destory unmount")
                        item.unmount();
                    }
                }

                app.workspace.off(EVENT_APP_RESIZE, undefined as any);
                app.workspace.off(EVENT_APP_CSS_CHANGE, undefined as any)
                app.workspace.off(EVENT_APP_QUICK_PREVIEW, undefined as any)
                app.workspace.off(EVENT_APP_LEAF_CHANGE_ACTIVE, undefined as any)

                app.workspace.off(EVENT_APP_MIND_REFRESH, undefined as any);
                app.workspace.off(EVENT_APP_MIND_EMBEDDED_RESIZE, undefined as any);
                app.workspace.off(EVENT_APP_MIND_NODE_REMARK_PREVIEW, undefined as any)
                app.workspace.off(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE, undefined as any)
                app.workspace.off(EVENT_APP_MIND_NODE_PRIORITY, undefined as any)
                app.workspace.off(EVENT_APP_MIND_EXPORT, undefined as any)

                app.workspace.off(EVENT_MIND_NODE_ACTIVE, undefined as any)
            }




            /**
             * Iterates through all embedded loom links and renders a Loom for each one.
             * Since a leaf can have an editing and reading view, we specify which child
             * to look in
             * @param markdownLeaf - The leaf that contains the markdown view
             * @param mode - The mode of the markdown view (source or preview)
             */
             loadEmbeddedMindApps = (
                manifestPluginVersion: string,
                markdownLeaf: WorkspaceLeaf,
                mode: "source" | "preview"
            ) => {
                const view = markdownLeaf.view as MarkdownView;
                const linkEls = getEmbeddedLoomLinkEls(view, mode);
                // debugger
                linkEls.forEach((linkEl) =>
                    this.processLinkEl(manifestPluginVersion, markdownLeaf, linkEl, mode)
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
            processLinkEl = async (
                manifestPluginVersion: string,
                leaf: WorkspaceLeaf,
                linkEl: HTMLElement,
                mode: "source" | "preview"
            ) => {
                const src = linkEl.getAttribute("src");
                if (!src) {
                    return;
                }
                if (!src.endsWith(FILE_EXTENSION)) {
                    return;
                }

                //如果已经渲染过了，仅仅修改尺寸
                if (hasLoadedEmbeddedMind(linkEl)) {
                    const DEFAULT_HEIGHT = '400px';
                    const DEFAULT_WIDTH = '100%';
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
                        app.workspace.trigger(EVENT_APP_MIND_EMBEDDED_RESIZE,leaf)
                    }
                    return;
                }


                const sourcePath = (leaf.view as MarkdownView).file?.path ?? "";
                const file = findEmbeddedMindFile(app, linkEl, sourcePath);
                if (!file) return;

                this.resetLinkStyles(linkEl);

                //Create a container
                const containerEl = this.renderContainerEl(linkEl,app,leaf);

                let mindHeight = linkEl.getAttribute("height");
                // debugger;
                if (mindHeight === null || mindHeight === "0") {
                    mindHeight = '400';
                }

                mindHeight += 'px';
                //Get state
                const data = await app.vault.read(file);
                // debugger;
                // console.log(data)
                const mindContainerId = Math.random();
                const mindApp = createApp(SimpleMindMap, {
                    leaf: leaf,
                    mindContainerId: mindContainerId,
                    mindFile: file,
                    initMindData: JSON.parse(data),
                    app: app,
                    mode: 'embedded',
                    initElementHeight: mindHeight,
                    showMiniMap: false,
                    showMindTools: true,
                    contentEl: containerEl
                })
                mindApp.mount(containerEl);
                this.mindAppList.push(mindApp);
            }


            /**
             * Creates a container for the embedded loom
             * This container has padding so that text doesn't touch the edges of the embed
             * @param linkEl - The link element that contains the embedded loom
             */
            renderContainerEl = (linkEl: HTMLElement,app: App,leaf: WorkspaceLeaf) => {
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
                    if (!(e.shiftKey || e.altKey) && !(e.ctrlKey || e.metaKey)) {
                        return;
                    }
                    const sourcePath = (leaf.view as MarkdownView).file?.path ?? "";
                    const targetElement = e.currentTarget as HTMLElement; // 断言当前目标为 HTMLElement
                    const file = findEmbeddedMindFile(app, targetElement.parentElement, sourcePath)
                    openFile({
                        file: file,
                        app: app,
                        newLeaf: (e.ctrlKey || e.metaKey) && !(e.shiftKey || e.altKey),
                        leafBySplit: (e.ctrlKey || e.metaKey) && (e.shiftKey || e.altKey),
                    });
                });
                return containerEl;
            };

            /**
             * Removes the default Obsidian styles from the link element
             * Obsidian by default will have a gray rectangle with padding and margin
             * @param linkEl - The link element that contains the embedded loom
             */
            resetLinkStyles = (linkEl: HTMLElement) => {
                //Clear default Obsidian placeholder content
                linkEl.empty();

                //Reset styles
                linkEl.style.backgroundColor = "var(--color-primary)";
                linkEl.style.cursor = "unset";
                linkEl.style.margin = "0px";
                linkEl.style.padding = "0px";
            };



        }
    );



}
