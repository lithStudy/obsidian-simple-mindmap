import {TextFileView} from "obsidian";
import {createApp, App as VueApp} from "vue";
// import SimpleMindMap from "./mindmapvue/simple-mind-map.vue";
import SimpleMindMap from "./mindmapvue/Main.vue";
import MindMap from "simple-mind-map";
import {
    EVENT_APP_CSS_CHANGE,
    EVENT_APP_MIND_EMBEDDED_RESIZE,
    EVENT_APP_LEAF_CHANGE_ACTIVE, EVENT_APP_MIND_EXPORT,
    EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE,
    EVENT_APP_MIND_NODE_PRIORITY,
    EVENT_APP_QUICK_PREVIEW,
    EVENT_APP_MIND_REFRESH,
    EVENT_APP_RESIZE,
    MARKMIND_DEFAULT_DATA
} from "./constants/constant";

export const MUFENG_MARKMIND_VIEW = "mufeng-mindmap";


export class MufengMindMapView extends TextFileView {
    private viewId: number;
    private pluginId: string;
    private pluginVersion: string;
    //思维导图对象
    private markMind: MindMap;
    //思维导图数据集
    private markMindData: {};

    private mindApp: {};

    private leaf: WorkspaceLeaf;


    constructor(leaf: WorkspaceLeaf, pluginId: string, pluginVersion: string) {
        super(leaf);
        this.leaf = leaf;
        this.pluginId = pluginId;
        this.pluginVersion = pluginVersion;
        this.data = "";
        this.viewId = Math.random();
        this.markMind = null;
        this.markMindData = {};
    }


    initMind = () => {
        if (!this.markMind) {
            console.log('mind init')
            // debugger
            //重置dom节点
            this.contentEl.empty();
            const newDiv = this.contentEl.createDiv({});
            // newDiv.style.height = '1000px';
            newDiv.style.width = '100%';


            const myId = Math.random();

            const paddingTop = parseFloat(getComputedStyle(this.contentEl).paddingTop);
            const paddingBottom = parseFloat(getComputedStyle(this.contentEl).paddingBottom);
            let heightWithoutPadding = this.contentEl.clientHeight - paddingTop - paddingBottom;
            //这里注意，重新启动obsidian的时候，this.contentEl可能还无法获取style，因此无法动态计算高度，暂时只能给个默认值
            if (isNaN(heightWithoutPadding) || heightWithoutPadding == null || heightWithoutPadding == 0) {
                heightWithoutPadding = 1000;
            }
            if (heightWithoutPadding < 0) {
                heightWithoutPadding = 1000;
            }

            // newDiv.style.height = heightWithoutPadding +"px";
            //debugger
            // 这里如果是打开新标签页，容器可能还没有渲染完成，无法执行命令，延迟一点时间
            setTimeout(() => {

                //视窗大小为0，说明焦点不在当前页面，不重置大小（思维导图的尺寸定位是根据视窗大小来的，如果焦点不在当前页面，视窗获取到的宽度和高度就是0）
                const elRect = newDiv.getBoundingClientRect()
                const widthTemp = elRect.width
                const heightTemp = elRect.height
                if (heightTemp <= 0 || widthTemp <= 0) {
                    console.log("导图容器不在视窗内")
                }
                //debugger
                const mindContainerId = Math.random();
                this.mindApp = createApp(SimpleMindMap, {
                    leaf: this.leaf,
                    viewId: this.viewId,
                    mindFile: this.file,
                    mindContainerId: mindContainerId,
                    initMindData: this.markMindData,
                    app: this.app,
                    mode: 'edit',
                    initNoteMode:'slide',
                    initElementHeight: heightWithoutPadding +"px",
                    showMiniMap: true,
                    showMindTools:true,
                    // contentEl: this.containerEl,
                    contentEl:this.contentEl
                })
                console.log("createApp after")
                const vm = this.mindApp.mount(newDiv);
                this.markMind = vm.mindMap
                // if(!this.markMind){
                //   debugger;
                // }

            }, 200);

        }
    }

    //obsidian获取数据
    getViewData() {
        return JSON.stringify(this.markMindData);
    }

    //obsidian保存数据
    setViewData(data: string, clear: boolean) {
        this.markMindData = JSON.parse(data);
        //clear为true，说明正在打开另一个文件
        if (clear) {
            if (this.mindApp) {
                console.log("卸载myapp")
                this.mindApp.unmount();
                this.markMind=null;
                this.onClose();
            }
            this.initMind();
        }

    }

    clear() {
        console.log("clear")
        this.markMindData = {};
    }


    async onOpen() {
        this.app.workspace.onLayoutReady(() => {
            console.log("open onLayoutReady")
        })
    }

    async onClose() {
        console.log('onClose')
        this.contentEl.empty();
        //重要：这个监听不销毁，会导致每次打开新的思维导图产生的vue实例无法销毁
        this.app.workspace.off(EVENT_APP_MIND_REFRESH);
        this.app.workspace.off(EVENT_APP_MIND_EMBEDDED_RESIZE);
        this.app.workspace.off(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE)
        this.app.workspace.off(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE)
        this.app.workspace.off(EVENT_APP_MIND_NODE_PRIORITY)
        this.app.workspace.off(EVENT_APP_MIND_EXPORT)
        this.app.workspace.off(EVENT_APP_RESIZE);
        this.app.workspace.off(EVENT_APP_CSS_CHANGE);
        this.app.workspace.off(EVENT_APP_QUICK_PREVIEW)
        this.app.workspace.off(EVENT_APP_LEAF_CHANGE_ACTIVE)
    }


    getViewType() {
        return MUFENG_MARKMIND_VIEW;
    }


    onDataChange() {
        console.log("onDataChange sssss")
    }

    onload() {
        super.onload();
        this.registerEvent(
            this.app.workspace.on(EVENT_APP_QUICK_PREVIEW, () => {
                console.log(EVENT_APP_QUICK_PREVIEW)
            }, this)
        );


    }


}