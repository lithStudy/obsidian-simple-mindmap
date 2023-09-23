/**
 * Import the modules.
 * 
 * 导入模块.
 */
import { App, PluginSettingTab } from "obsidian";
import { createApp } from "vue";
import SamplePlugin from "./main";
// import NodeEdit from "./mindmapvue/NodeEdit";

/**
 * The plugin setting-tab.
 * 
 * 插件设置页.
 */
export class SampleSettingTab extends PluginSettingTab {
    /**
     * The instance of the plugin.
     * 
     * The plugin setting-tab must hold an instance of the plugin so that changes can be made to the plugin.
     * 
     * 插件的实例.
     * 
     * 插件设置页必须持有插件的实例以便可以对插件作出更改.
     */
    plugin: SamplePlugin;
    /**
     * To construct a new instance of the plugin setting-tab.
     * 
     * 为插件设置页构造一个新实例.
     */
    constructor(app: App, plugin: SamplePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    /**
     * This method runs when the plugin setting-tab is displayed.
     * 
     * This is where you build the content for the plugin setting-tab.
     * 
     * 此方法在显示插件设置页时触发.
     * 
     * 这是您构建插件设置页内容的地方.
     */
    display() {
        /**
         * To achieve the effect of refreshing, the content of the plugin setting-tab must be cleared each time before building a new one.
         * 
         * 为了实现刷新的效果, 每次在构建新的插件设置页之前都必须先清空其内容.
         */
        const { containerEl } = this;
        containerEl.empty();
        /**
         * Mount the `SampleSettingTabPage` component.
         * 
         * 挂载 `SampleSettingTabPage` 组件.
         */
        createApp(NodeEdit).mount(containerEl);
    }
}
