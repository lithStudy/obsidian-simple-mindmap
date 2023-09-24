import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp ,App as VueApp} from "vue";
import SampleSettingTabPage from "./SettingTabPage.vue";
import MindMap from "simple-mind-map";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example view";
  }

  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    const div1 = container.createEl("div", { cls: "book" });

    // const app = createApp(Remark,{})
    // app.mount(div1)


  }

  async onClose() {
    
  }
}