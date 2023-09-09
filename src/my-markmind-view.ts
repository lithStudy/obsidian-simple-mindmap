import { TextFileView } from "obsidian";
import { createApp ,App as VueApp} from "vue";
import SimpleMindMap from "./simple-mind-map.vue";
import MindMap from "simple-mind-map";
import { EVENT_APP_REFRESH ,MARKMIND_DEFAULT_DATA} from "./constants/constant";

export const MUFENG_MARKMIND_VIEW = "mufeng-markmind";


const MARKMIND_DEFAULT_DATA={
  "data": {
      "text": "根节点"
  },
  "children": []
}

export class MufengMakrMindView extends TextFileView {
  //vm实例
  vm;
  //思维导图对象
  markMind:MindMap;
  //思维导图数据集
  markMindData:{};

  //obsidian获取数据
  getViewData() {
    return JSON.stringify(this.markMindData);
  }

  //
  setViewData(data: string, clear: boolean) {
    // console.log("setViewData:"+data)
    this.markMindData = JSON.parse(data);
    

    if(!this.markMind){
      //重置dom节点
      this.contentEl.empty();
      const newDiv = this.contentEl.createDiv({});
      newDiv.style.height='1000px';
      newDiv.style.width='1000px';

      const myId = Math.random();   
      //创建思维导图
      
     //这里容器可能还没有渲染完成，无法执行命令，延迟一点时间
      setTimeout(() => {
        this.vm = createApp(SimpleMindMap, { mindFile:this.file,initMindData: JSON.parse(data),app:this.app,mode:'edit'}).mount(newDiv);   	
        // const vm = createApp(SimpleMindMap, { initMindData: JSON.parse(data),app:this.app,mindId:myId}).mount(newDiv);      
        this.markMind=this.vm.$data.markMind;

        
        
        //默认激活根节点
        // this.markMind.renderer.setNodeActive(this.markMind.renderer.root.isParent)
        // console.log('默认激活根节点'+this.markMind.renderer.root.isParent)
  
        
        // setTimeout(() => {
        //    //监控导图数据变更事件
        //   this.markMind.on('data_change', (...args) => {
        //     this.markMindData = args[0];
        //     // this.mindDataChange(args[0])        
        //   })

        //   this.markMind.on('view_data_change', (...args) => {
        //     // console.log("view_data_change")
        //   })

        //   //默认选中根目录
        //   this.markMind.execCommand('GO_TARGET_NODE', this.markMind.renderer.root, () => {
        //     //定位完成后的回调函数
        //     // this.notHandleDataChange = false
        //   })
        // },200)
        
      }, 200);
    }

  }

  clear() {
    this.markMindData={};
  }


  async onOpen() {
    console.log("onOpen() start")
    
    
    //监听obsidian尺寸变换
    // this.registerEvent(
    //   this.app.workspace.on('resize', () => {
    //     console.log('resize')
    //     //重置思维导图尺寸
    //     this.markMind.resize();
    //   }, this)
    // );
    
    console.log("onOpen() end")

  }

  async onClose() {
    console.log('onClose')
    this.markMind.off('data_change')
    this.markMind.off('view_data_change')

    this.contentEl.empty();
    //重要：这个监听不销毁，会导致每次打开新的思维导图产生的vue实例无法销毁
    this.app.workspace.off(EVENT_APP_REFRESH);
    // debugger
    // this.vm.$destroy();
  }


  getViewType() {
    return MUFENG_MARKMIND_VIEW;
  }


  onDataChange(){
    console.log("onDataChange sssss")
  }

  onload() {
    super.onload();
    this.registerEvent(
      this.app.workspace.on("quick-preview", () => {
        console.log('quick-preview')
      }, this)
    );
  }


  // mindDataChange(data:{}){
  //   console.log("mindDataChange:"+JSON.stringify(data))
  //   // debugger;
  //   this.markMindData = data;
  //   this.requestSave();
  // }
  

  

}