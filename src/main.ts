/**
 * Import the modules.
 *
 * 导入模块.
 */
import {
    Plugin,
    WorkspaceLeaf,
    ViewState,
    MarkdownView,
    normalizePath,
} from 'obsidian';
import {SampleSettingTab} from "./setting-tab";
import {MufengMindMapView, MUFENG_MARKMIND_VIEW} from "./mindmap-edit-view"
import PreviewPlugin from "./mindmap-embedded-view";
import {createApp} from "vue";
import SimpleMindMap from "./mindmapvue/Main.vue";
import {
    EVENT_APP_MIND_EXPORT,
    EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE,
    EVENT_APP_MIND_NODE_PRIORITY,
    FILE_EXTENSION
} from "./constants/constant";
import {getBasename} from "./utils/link-utils";
import {MARKMIND_DEFAULT_REAL_DATA} from "./utils/mind-content-util";
import {FileSelectionModal} from "./utils/file-import";
import {createMindMapFile} from "./utils/file-operations";


export interface MindSettings {
    createAtObsidianAttachmentFolder: boolean;
    customFolderForNewFiles: string;
    removeMarkdownOnExport: boolean;
    defaultEmbedWidth: string;
    defaultEmbedHeight: string;
    defaultInitData: { };
}

export const DEFAULT_SETTINGS: MindSettings = {
    createAtObsidianAttachmentFolder: true,
    customFolderForNewFiles: "",
    removeMarkdownOnExport: true,
    defaultEmbedWidth: "100%",
    defaultEmbedHeight: "340px",
    defaultInitData:MARKMIND_DEFAULT_REAL_DATA,
};

/**
 * The plugin.
 *
 * Make a default export for Obsidian to load the plugin.
 *
 * 插件.
 *
 * 进行默认导出以作为 Obsidian 加载插件的入口.
 */
export default class SamplePlugin extends Plugin {
    mindmapFileModes: { [file: string]: string } = {};

    settings: MindSettings;

    /**
     * This method runs when the plugin is enabled or updated.
     *
     * This is where you will configure most of the capabilities of the plugin.
     *
     * 此方法在插件被激活或更新时触发.
     *
     * 这将是您设置插件大部分功能的地方.
     */
    async onload() {
        /**
         * 加载配置
         */
        await this.loadSettings();
        /**
         * Register the plugin setting-tab.
         *
         * 注册插件设置页.
         */
        this.addSettingTab(new SampleSettingTab(this.app, this));


        this.registerView(
            MUFENG_MARKMIND_VIEW,
            (leaf) => new MufengMindMapView(leaf, this.manifest.id, this.manifest.version)
        );
        //注册打开特定扩展名的视图
        this.registerExtensions(["mind"], MUFENG_MARKMIND_VIEW);

        // this.addRibbonIcon("dice", "mufeng view", () => {
        //     this.activateTestView();
        // });

        //注册命令
        this.registerCommands();

        //注册编辑器扩展
        this.registerEditorExtension(
            PreviewPlugin(this.app, this.manifest.version)
        );

        //注册mind预览模式下后处理器
        this.registerMarkdownPostProcessor(async (element, context) => {
            const linkEls = element.querySelectorAll(".internal-embed");
            if(linkEls){
                linkEls.forEach((linkEl)=>{
                    const src = linkEl.getAttribute("src");
                    //只处理mind后缀的
                    if (src?.endsWith(FILE_EXTENSION)){
                        
                      if (src){
                        //这里移除此css样式的目的是为了阻止跳转
                        //阻止跳转的目的有两个：1.方便直接预览而不是跳到详情页面查看，2.这里有个未知bug：如果从预览页面跳转到详情页，在退回到预览页会导致快捷键都失效掉
                        linkEl.classList.remove('internal-embed');
                        this.loadMind(src,context,linkEl);
                      }
                    }

                })  
            }
        });

    }

    /**
     * This method runs when the plugin is disabled.
     *
     * Any resources that the plugin is using must be released here to avoid affecting the performance of Obsidian after the plugin has been disabled.
     *
     * 此方法在插件被禁用时触发.
     *
     * 插件所调用的所有资源必须在这里得到释放, 以防止插件被禁用后对 Obsidian 的性能产生影响.
     */
    onunload() {
        console.log("main onunload")
        this.app.workspace.detachLeavesOfType(MUFENG_MARKMIND_VIEW);
    }


    async setMarkdownView(leaf: WorkspaceLeaf) {
        await leaf.setViewState(
            {
                type: "markdown",
                state: leaf.view.getState(),
                popstate: true,
            } as ViewState,
            {focus: true}
        );
    }

    async setMindMapView(leaf: WorkspaceLeaf) {
        await leaf.setViewState({
            type: MUFENG_MARKMIND_VIEW,
            state: leaf.view.getState(),
            popstate: true,
        } as ViewState);
    }



    registerCommands() {
        this.addCommand({
            id: "create",
            name: "Create mindMap",
            // hotkeys: [{ modifiers: ["Mod", "Shift"], key: "=" }],
            callback: async () => {
                await this.newMindMapFile(null);
            },
        });

        this.addCommand({
            id: "create-and-embed",
            name: "Create mindMap and embed it into current file",
            // hotkeys: [{ modifiers: ["Mod", "Shift"], key: "+" }],
            editorCallback: async (editor) => {
                const filePath = await this.newMindMapFile(null, true,null,null);
                if (!filePath) return;

                const useMarkdownLinks = (this.app.vault as any).getConfig(
                    "useMarkdownLinks"
                );

                // Use basename rather than whole name when using Markdownlink like ![abcd](abcd.loom) instead of ![abcd.loom](abcd.loom)
                // It will replace `.loom` to "" in abcd.loom
                const linkText = useMarkdownLinks
                    ? `![${getBasename(filePath)}](${encodeURI(filePath)})`
                    : `![[${filePath}]]`;

                editor.replaceRange(linkText, editor.getCursor());
                editor.setCursor(
                    editor.getCursor().line,
                    editor.getCursor().ch + linkText.length
                );

                //Open file in a new tab and set it to active
                await this.app.workspace.getLeaf(true).setViewState({
                    type: MUFENG_MARKMIND_VIEW,
                    active: true,
                    state: { file: filePath },
                });
            },
        });

        // this.addCommand({
        //     id: "export-markdown",
        //     name: "Export as markdown",
        //     checkCallback: (checking: boolean) => {
        //         const loomView =
        //             this.app.workspace.getActiveViewOfType(MufengMindMapView);
        //         const markdownView =
        //             this.app.workspace.getActiveViewOfType(MarkdownView);
        //         if (loomView || markdownView) {
        //             if (!checking) {
        //                 this.app.workspace.trigger(EVENT_DOWNLOAD_MARKDOWN);
        //             }
        //             return true;
        //         }
        //         return false;
        //     },
        // });

        //添加命令：切换导图模式与源码模式
        this.addCommand({
            id: 'Toggle',
            name: 'Toggle markdown/mindmap',
            mobileOnly: false,
            callback: () => {
                const mindmapView = this.app.workspace.getActiveViewOfType(MufengMindMapView);
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                // console.log('markdownView:'+markdownView)
                if (mindmapView != null) {
                    // this.mindmapFileModes[(mindmapView.leaf as any).id || mindmapView.file.path] = 'markdown';
                    this.setMarkdownView(mindmapView.leaf);
                } else if (markdownView != null) {
                    // this.mindmapFileModes[(markdownView.leaf as any).id || markdownView.file.path] = MUFENG_MARKMIND_VIEW;
                    this.setMindMapView(markdownView.leaf);
                }
            }
        });

        //激活备注
        this.addCommand({
            id: "remark",
            name: "remark",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        //激活备注输入框
                        this.app.workspace.trigger(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE)
                    }
                    return true;
                }
                return false;
            },
        });
        //设置优先级
        this.addCommand({
            id: "priority",
            name: "priority",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        //优先级
                        this.app.workspace.trigger(EVENT_APP_MIND_NODE_PRIORITY)
                    }
                    return true;
                }
                return false;
            },
        });
        //导出-图片
        this.addCommand({
            id: "export-png",
            name: "export-png",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        const activeFile=this.app.workspace.getActiveFile();
                        this.exportData('png',activeFile.basename)
                    }
                    return true;
                }
                return false;
            },
        });
        // //导出-pdf
        // this.addCommand({
        //     id: "export-pdf",
        //     name: "export-pdf",
        //     checkCallback: (checking: boolean) => {
        //         const loomView =
        //             this.app.workspace.getActiveViewOfType(MufengMindMapView);
        //         if (loomView) {
        //             if (!checking) {
        //                 const activeFile=this.app.workspace.getActiveFile();
        //                 this.exportData('pdf',activeFile.basename)
        //             }
        //             return true;
        //         }
        //         return false;
        //     },
        // });
        //导出-svg
        this.addCommand({
            id: "export-svg",
            name: "export-svg",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        const activeFile=this.app.workspace.getActiveFile();
                        this.exportData('svg',activeFile.basename)
                    }
                    return true;
                }
                return false;
            },
        });
        //导出-json
        this.addCommand({
            id: "export-json",
            name: "export-json",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        const activeFile=this.app.workspace.getActiveFile();
                        this.exportData('json',activeFile.basename)
                    }
                    return true;
                }
                return false;
            },
        });
        //导出-md
        this.addCommand({
            id: "export-md",
            name: "export-md",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        const activeFile=this.app.workspace.getActiveFile();
                        this.exportData('md',activeFile.basename)
                    }
                    return true;
                }
                return false;
            },
        });
        //导出-md拷贝
        this.addCommand({
            id: "export-md-copy",
            name: "export-md-copy",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        const activeFile=this.app.workspace.getActiveFile();
                        this.exportData('md-copy',activeFile.basename)
                    }
                    return true;
                }
                return false;
            },
        });
         //导出-smm原始文件
         this.addCommand({
            id: "export-smm",
            name: "export-smm",
            checkCallback: (checking: boolean) => {
                const loomView =
                    this.app.workspace.getActiveViewOfType(MufengMindMapView);
                if (loomView) {
                    if (!checking) {
                        const activeFile=this.app.workspace.getActiveFile();
                        this.exportData('smm',activeFile.basename)
                    }
                    return true;
                }
                return false;
            },
        });


        //导入-smm原始文件
        this.addCommand({
            id: "import-smm",
            name: "import-smm",
            callback: () => {
                const modal = new FileSelectionModal(this.app);
                modal.setHandler(this, this.newMindMapFile);
                modal.setDefaults(this.settings);
                modal.open();
            }
        });

    }

    private getFolderForNewMindFile(contextMenuFolderPath: string | null) {
        let folderPath = "";

        if (contextMenuFolderPath) {
            folderPath = contextMenuFolderPath;
        }
        //不指定文件夹时，如果设置中的自定义文件夹路径不为空，就放在自定义文件夹中
        else if (this.settings.customFolderForNewFiles){
            folderPath = this.settings.customFolderForNewFiles;
        }
        //如果自定义文件夹为空（没有设置），如果配置中允许使用系统附件文件夹，放在系统文件夹
        else if (this.settings.createAtObsidianAttachmentFolder) {
            folderPath = (this.app.vault as any).getConfig(
                "attachmentFolderPath"
            );
        } else {
            // folderPath = this.settings.customFolderForNewFiles;

        }
        const normalized = normalizePath(folderPath);
        if (normalized === ".") return "/";
        return normalized;
    }

    private async newMindMapFile(
        contextMenuFolderPath: string | null,
        embedded?: boolean,
        initData?:string,
        fileName?:string,
    ) {
        const folderPath = this.getFolderForNewMindFile(contextMenuFolderPath);
        const filePath = await createMindMapFile(
            this.app,
            folderPath,
            this.manifest.version,
            initData?initData:JSON.stringify(this.settings.defaultInitData),
            fileName
        );

        //If the file is embedded, we don't need to open it
        if (embedded) return filePath;

        //Open file in a new tab and set it to active
        await this.app.workspace.getLeaf(true).setViewState({
            type: MUFENG_MARKMIND_VIEW,
            active: true,
            state: { file: filePath },
        });
    }


    private async loadMind(src,context,linkEl){
        linkEl.addEventListener("click", (e) => {
            console.log("linkEl.addEventListener stop")
            e.preventDefault();
        });

        const file  = this.app.metadataCache.getFirstLinkpathDest(src, context.sourcePath)
        if(file){
            let mindHeight =  linkEl.getAttribute("height");
            // debugger;
            if (mindHeight === null || mindHeight === "0") {
                mindHeight='400';
            }
            mindHeight+='px';

            linkEl.empty();
            linkEl.style.height='400px';
            linkEl.style.width = "100%";
            const data =await this.app.vault.read(file);
            createApp(SimpleMindMap, {
                    mindFile:file,
                    initMindData: JSON.parse(data),
                    app: this.app,
                    mode: 'preview',
                    contentEl:linkEl,
                    showMiniMap: false,
                    showMindTools:false,
                    initNoteMode:'notSlide',
                    initElementHeight: mindHeight,

                    leaf: context,
                    viewId: 0,

            }).mount(linkEl);
            

        }
    }


    private exportData(exportType:string,fileName:string|"思维导图"){
        if(exportType=='md-copy'){
            this.app.workspace.trigger(EVENT_APP_MIND_EXPORT,
                exportType                
            )
        }else if (exportType === 'svg') {
            this.app.workspace.trigger(EVENT_APP_MIND_EXPORT,
              exportType,
              true,
              fileName
            )
          } else if (exportType==='smm') {
            this.app.workspace.trigger(EVENT_APP_MIND_EXPORT,
              exportType,
              true,
              fileName,
              true
            )
          } else if (exportType==='json') {
            this.app.workspace.trigger(EVENT_APP_MIND_EXPORT,
              exportType,
              true,
              fileName,
              true
            )
          }else if (exportType === 'png') {
            this.app.workspace.trigger(EVENT_APP_MIND_EXPORT,
              exportType,
              true,
              fileName,
              true
            )
          }
        // else if (exportType === 'pdf') {
        //     this.app.workspace.trigger(EVENT_APP_MIND_EXPORT, exportType, true, fileName, false)
        // }
        else {
            this.app.workspace.trigger(EVENT_APP_MIND_EXPORT, exportType, true, fileName)
        }
    }

    // async loadSettings() {
    //     this.settings = Object.assign(
    //         {},
    //         DEFAULT_SETTINGS,
    //         // await this.loadData()
    //         null
    //     );
    //     // store.dispatch(setSettings({ ...this.settings }));
    // }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
        // store.dispatch(setSettings({ ...this.settings }));
    }

    async saveSettings() {
        await this.saveData(this.settings);
        // store.dispatch(setSettings({ ...this.settings }));
    }


}
