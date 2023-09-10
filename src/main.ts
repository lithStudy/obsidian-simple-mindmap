/**
 * Import the modules.
 * 
 * 导入模块.
 */
import {
  Plugin,
  WorkspaceLeaf,
  TFile,
  TFolder,
  ViewState,
  MarkdownView
} from 'obsidian';
import { SampleSettingTab } from "./setting-tab";
// import { ExampleView, VIEW_TYPE_EXAMPLE } from "./test-view";
import { MufengMakrMindView, MUFENG_MARKMIND_VIEW } from "./my-markmind-view"
import EditingViewPlugin from "./editing-view-plugin";
import {getEmbeddedLoomLinkEls,findEmbeddedLoomFile} from "./embedded/embed-utils"
import { createApp ,App as VueApp} from "vue";
import SimpleMindMap from "./simple-mind-map.vue";
import { FILE_EXTENSION } from "./constants/constant";

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
    /**
     * This method runs when the plugin is enabled or updated.
     * 
     * This is where you will configure most of the capabilities of the plugin.
     * 
     * 此方法在插件被激活或更新时触发.
     * 
     * 这将是您设置插件大部分功能的地方.
     */
    onload() {
        /**
         * Register the plugin setting-tab.
         * 
         * 注册插件设置页.
         */
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // this.registerView(
        //     VIEW_TYPE_EXAMPLE,
        //     (leaf) => new ExampleView(leaf)
        //   );
        
        // this.addRibbonIcon("dice", "Activate view", () => {
        //     this.activateTestView();
        // });



        this.registerView(
          MUFENG_MARKMIND_VIEW,
          (leaf) => new MufengMakrMindView(leaf)
        );
        //注册打开特定扩展名的视图
        this.registerExtensions(["mind"], MUFENG_MARKMIND_VIEW);

        this.addRibbonIcon("dice", "mufeng view", () => {
          this.activateTestView();
        });
        
        //添加命令：切换导图模式与源码模式
        this.addCommand({
          id: 'Toggle',
          name: 'Toggle markdown/mindmap',
          mobileOnly: false,
          callback: () => {
              const mindmapView = this.app.workspace.getActiveViewOfType(MufengMakrMindView);
              const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
              // console.log('markdownView:'+markdownView)
              if(mindmapView!=null){
                // this.mindmapFileModes[(mindmapView.leaf as any).id || mindmapView.file.path] = 'markdown'; 
                this.setMarkdownView(mindmapView.leaf);
              }else if(markdownView!=null){
                // this.mindmapFileModes[(markdownView.leaf as any).id || markdownView.file.path] = MUFENG_MARKMIND_VIEW;
                this.setMindMapView(markdownView.leaf);
              }
          }
        });

        //注册编辑器扩展
        this.registerEditorExtension(
          EditingViewPlugin(this.app, this.manifest.version)
        );

        //注册mind预览模式下后处理器
        this.registerMarkdownPostProcessor(async (element, context) => {
          const linkEl = element.querySelector(".internal-embed");
          if(linkEl){
            const src = linkEl.getAttribute("src");
            //只处理mind后缀的
            if (src?.endsWith(FILE_EXTENSION)){
              if (src){
                const file  = this.app.metadataCache.getFirstLinkpathDest(src, context.sourcePath)
                if(file){ 
                  let mindHeight =  linkEl.getAttribute("height");
                  // debugger;
                  if (mindHeight === null || mindHeight === "0") {
                    mindHeight='400';
                  }
                  mindHeight+='px';

                  const data =await this.app.vault.read(file);
                  const vm = createApp(SimpleMindMap, { mindFile:file,initMindData: JSON.parse(data),app:this.app,mode:'preview',initElementHeight:mindHeight}).mount(linkEl);   	            
                }
              }
            }
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
        // this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
        this.app.workspace.detachLeavesOfType(MUFENG_MARKMIND_VIEW);
    }

    async activateTestView() {
        this.app.workspace.detachLeavesOfType(MUFENG_MARKMIND_VIEW);
    
        await this.app.workspace.getRightLeaf(false).setViewState({
          type: MUFENG_MARKMIND_VIEW,
          active: true,
        });
    
        this.app.workspace.revealLeaf(
          this.app.workspace.getLeavesOfType(MUFENG_MARKMIND_VIEW)[0]
        );
    }



   async setMarkdownView(leaf: WorkspaceLeaf) {
    await leaf.setViewState(
      {
        type: "markdown",
        state: leaf.view.getState(),
        popstate: true,
      } as ViewState,
      { focus: true }
    );
  }
  async setMindMapView(leaf: WorkspaceLeaf) {
    await leaf.setViewState({
      type: MUFENG_MARKMIND_VIEW,
      state: leaf.view.getState(),
      popstate: true,
    } as ViewState);
  }


 

}
