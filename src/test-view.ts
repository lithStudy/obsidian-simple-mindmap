import { ItemView, WorkspaceLeaf } from "obsidian";
import { createApp ,App as VueApp} from "vue";
// import SampleSettingTabPage from "./SettingTabPage.vue";
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
    setTimeout(() => {
      console.log("333")
      // createApp(SampleSettingTabPage).mount(div1);
    }, 1000);
   


  
    // new MindMap({
    //     el: div1,
    //     data: {
    //       "data": {
    //           "text": "根节点"
    //       },
    //       "children": []
    //     }
    //   });
  }

  async onClose() {
    
  }
}