import {TextFileView, WorkspaceLeaf} from "obsidian";
import {createApp, App as VueApp} from "vue";
// import SimpleMindMap from "./mindmapvue/simple-mind-map.vue";
import SimpleMindMap from "./mindmapvue/Main.vue";
import { MARKMIND_DEFAULT_REAL_DATA} from "./utils/mind-content-util";

export const MUFENG_MARKMIND_VIEW = "mufeng-mindmap";


export class MufengMindMapView extends TextFileView {
    private viewId: number;
    private pluginId: string;
    private pluginVersion: string;
    //思维导图对象
    private markMind: { };
    //思维导图数据集
    private markMindData: {};

    private mindApp: VueApp;

    // public leaf: WorkspaceLeaf;

    private eventRefs: { [key: string]: any } = {};

    private retryCount: number;

    constructor(leaf: WorkspaceLeaf, pluginId: string, pluginVersion: string) {
        super(leaf);
        this.leaf = leaf;
        this.pluginId = pluginId;
        this.pluginVersion = pluginVersion;
        this.data = "";
        this.viewId = Math.random();
        this.markMind = null;
        this.markMindData = MARKMIND_DEFAULT_REAL_DATA;
    }


    initMind = () => {
        if (!this.markMind) {
            console.log('mind init')
            
            // 添加重试计数
            if (!this.retryCount) {
                this.retryCount = 0;
            }
            const maxRetries = 5;
            
            // debugger
            //重置dom节点
            this.contentEl.empty();
            const newDiv = this.contentEl.createDiv({});
            newDiv.style.width = '100%';
            
            // 添加唯一ID以便于查找
            const containerId = `mindMapContainer-${this.viewId}`;
            newDiv.id = containerId;
            console.log(`创建容器元素，ID: ${containerId}`);

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

            // 设置明确的高度
            newDiv.style.height = heightWithoutPadding + "px";
            
            console.log(`容器尺寸设置为: 宽度=100%, 高度=${heightWithoutPadding}px`);
            
            //debugger
            // 这里如果是打开新标签页，容器可能还没有渲染完成，无法执行命令，延迟一点时间
            setTimeout(() => {
                try {
                    //视窗大小为0，说明焦点不在当前页面，不重置大小（思维导图的尺寸定位是根据视窗大小来的，如果焦点不在当前页面，视窗获取到的宽度和高度就是0）
                    const elRect = newDiv.getBoundingClientRect()
                    const widthTemp = elRect.width
                    const heightTemp = elRect.height
                    
                    console.log(`容器实际尺寸: 宽度=${widthTemp}, 高度=${heightTemp}`);
                    
                    if (heightTemp <= 0 || widthTemp <= 0) {
                        console.log("导图容器不在视窗内");
                        
                        // 增加重试逻辑
                        this.retryCount++;
                        if (this.retryCount <= maxRetries) {
                            console.log(`尝试重新初始化思维导图视图 (${this.retryCount}/${maxRetries})...`);
                            setTimeout(() => {
                                this.initMind();
                            }, 800); // 增加延迟时间
                        } else {
                            console.error(`已达到最大重试次数(${maxRetries})，思维导图视图初始化失败`);
                        }
                        return;
                    }
                    
                    // 重置重试计数
                    this.retryCount = 0;
                    
                    //debugger
                    const mindContainerId = Math.random();
                    console.log("准备创建Vue应用");
                    
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
                        enableAutoEnterTextEditWhenKeydown:true,
                        // contentEl: this.containerEl,
                        contentEl:this.contentEl
                    })
                    console.log("createApp after")
                    // const vm = this.mindApp.mount(newDiv);
                    // this.markMind = vm.mindMap

                    this.markMind= this.mindApp.mount(newDiv);
                    console.log("思维导图视图初始化成功");
                    
                } catch (error) {
                    console.error("初始化思维导图视图时出错:", error);
                    
                    // 增加重试逻辑
                    this.retryCount++;
                    if (this.retryCount <= maxRetries) {
                        console.log(`发生错误，尝试重新初始化思维导图视图 (${this.retryCount}/${maxRetries})...`);
                        setTimeout(() => {
                            this.initMind();
                        }, 800); // 增加延迟时间
                    } else {
                        console.error(`已达到最大重试次数(${maxRetries})，思维导图视图初始化失败`);
                    }
                }
            }, 800); // 增加延迟时间，确保DOM已完全渲染

        }
    }

    //obsidian保存数据
    getViewData() {
        return JSON.stringify(this.markMindData);
        // return fullOrginMindData(this.markMindData);
    }

    //从文件中获取数据并使用
    setViewData(data: string, clear: boolean) {
        // console.log('setViewData')
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
        this.markMindData = MARKMIND_DEFAULT_REAL_DATA;
    }


    async onOpen() {
        this.app.workspace.onLayoutReady(() => {
            console.log("open onLayoutReady")
        })
    }

    async onClose() {
        console.log('mindmap-edit-vue onClose')
        if (this.mindApp) {
            this.mindApp.unmount();
            this.markMind = null;
            this.contentEl.empty();
        }
    }


    getViewType() {
        return MUFENG_MARKMIND_VIEW;
    }


    onDataChange() {
        console.log("onDataChange sssss")
    }

    onload() {
        super.onload();
        // this.eventRefs[EVENT_APP_QUICK_PREVIEW] = () => {
        //     console.log(EVENT_APP_QUICK_PREVIEW)
        // };
        // this.registerEvent(
        //     this.app.workspace.on(EVENT_APP_QUICK_PREVIEW, this.eventRefs[EVENT_APP_QUICK_PREVIEW], this)
        // );
    }


}