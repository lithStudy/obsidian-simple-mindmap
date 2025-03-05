<template>
  <div>
    <div
        class="mindToolsBox"
        :class="{ isDark: isDark }"
        :style="{ top: top + 'px', right: right + 'px'}"
        ref="mindToolsBox"
    >
      <div @click="resize()" class="toolsButton">重定位</div>
      <div @click="refresh()" class="toolsButton">刷新</div>
      <div @click="remark()" v-if="this.mode !== 'embedded' && this.mode !== 'preview'" id="remarkButton" class="toolsButton">备注</div>
      <div @click="priority()" v-if="this.mode !== 'embedded' && this.mode !== 'preview'" id="priorityButton" class="toolsButton">优先级</div>
      <div @click="setLink()" v-if="this.mode !== 'embedded' && this.mode !== 'preview'" id="linkButton" class="toolsButton">设置链接</div>
    </div>
  </div>

</template>

<script>
// import { useEmitter  } from 'vue'
// import ExportPDF from 'simple-mind-map/src/plugins/ExportPDF.js'
import { transformToMarkdown } from 'simple-mind-map/src/parse/toMarkdown.js'
import { Notice } from "obsidian";
import {EVENT_APP_CSS_CHANGE, EVENT_APP_MIND_EXPORT, EVENT_APP_MIND_NODE_PRIORITY, EVENT_APP_LAYOUT_CHANGE, EVENT_APP_RESIZE, EVENT_APP_MIND_NODE_LINK} from "../constants/constant";

export default {
  props: {
    mindMap: {
      type: Object
    },
    app: {            
      required: false
    },
    contentEl:{
      required:false
    },
    mode: {
      required: false
    },
    mindFile:{
      required: false
    }
  },
  data() {
    return {
      isDark:false,
      showMiniMap: true,
      timer: null,
      boxWidth: 0,
      boxHeight: 0,
      top:0,
      right:0,
      remarkTop:0,
      remarkRight:0,
      showRemark:true,
      remarkContent:"",
      clickCount: 0,         // 点击次数计数器
      clickTimestamps: [],   // 点击时间戳数组
      resizeTimer: null
    }
  },
  computed: {
    // ...mapState(['isDark']),
  },
  mounted() {
    console.log("Tools mounted")
    // this.updateTheme()
    this.setPosition();
    this.app.workspace.on(EVENT_APP_CSS_CHANGE, this.updateTheme,this.app)

    this.app.workspace.on(EVENT_APP_MIND_NODE_PRIORITY,this.priority)
    this.app.workspace.on(EVENT_APP_MIND_EXPORT,this.exportData)
    // 监听工作区布局变化
    this.app.workspace.on(EVENT_APP_LAYOUT_CHANGE, this.setPosition);
    // 监听窗口大小调整
    this.app.workspace.on(EVENT_APP_RESIZE, this.setPosition);
  },
  unmounted() {
    console.log("Tools unmounted")
    this.app.workspace.off(EVENT_APP_CSS_CHANGE,this.updateTheme,this.app);
    this.app.workspace.off(EVENT_APP_MIND_NODE_PRIORITY,this.priority);
    this.app.workspace.off(EVENT_APP_MIND_EXPORT,this.exportData)

    // 清理事件监听
    this.app.workspace.off(EVENT_APP_LAYOUT_CHANGE);
    this.app.workspace.off(EVENT_APP_RESIZE);
  },
  methods: {
    resize(){
      // console.log("定位根节点")
      this.mindMap.resize();
      // this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root,false)
      //缩放思维导图至适应画布
      this.mindMap.view.fit()
    },
    async refresh(){
      const newMindData = await this.app.vault.read(this.mindFile);
      // this.mindMap.setData(newMindData)
      this.mindMap.renderer.setData(JSON.parse(newMindData));
      this.mindMap.reRender()
    },
    remark(){
      console.log("点击备注按钮")
      this.$emit('remakModelToggle', '新的值');
      
      if(this.resizeTimer) {
        clearTimeout(this.resizeTimer);
      }
      
      this.resizeTimer = setTimeout(() => {
        this.setPosition();
      }, 100);
    },
    saveRemark(){
      if (this.mindMap.renderer.activeNodeList.length <= 0) {
        return
      }
      this.mindMap.renderer.activeNodeList[0].setNote(this.remarkContent)
    },
    updateTheme(){
      const el = document.querySelector("body");
      //是否深色模式
      if(el?.className.includes("theme-dark") ?? false){
        this.isDark=true;
      }else{
        this.isDark=false;
      }
    },
    setPosition(){
        // 获取父容器和子元素
        if(!this.contentEl) return;
        const parentElement = this.contentEl.parentElement
        const childElement = this.contentEl.querySelector('#mindMapContainer');
        if(!parentElement || !childElement) return;

        // 获取子元素相对于父容器的位置信息
        const parentRect = parentElement.getBoundingClientRect();
        const childRect = childElement.getBoundingClientRect();

        const relativeRight = parentRect.right - childRect.right;
        const relativeTop = childRect.top - parentRect.top;

        this.right=relativeRight
        this.top=relativeTop
        this.remarkTop = this.top
        this.remarkRight = this.right+130
    },
    priority(){
      if (this.mindMap.renderer.activeNodeList.length <= 0) {
        return
      }
      const node=this.mindMap.renderer.activeNodeList[0]
      const existIcon = node.getData('icon')
      if(existIcon && existIcon[0]){
        //循环三级优先级
        let oldNum = existIcon[0].split('_')[1];
        oldNum++;
        //第4次清除优先级
        oldNum = oldNum % 4
        if(oldNum===0){
          node.setIcon([])
        }else{
          node.setIcon(['priority_'+oldNum])
        }
        
      }else{
        node.setIcon(["priority_1"])
      }
    },
    exportData(...args){
      if(args[0]==='md-copy'){
        let data = this.mindMap.getData()
        let content = transformToMarkdown(data)
        navigator.clipboard.writeText(content).then(() => {
          new Notice("已将md内容复制到剪切板");        
        }).catch((err) => {
          new Notice("md内容复制到剪切板失败");
        });

      }else{
        try {
          this.mindMap.export(...args)
        } catch (error) {
          console.log(error)
        }
      }
      
    },
    mindNodeActive(node){
        if (!node) {
            return
        }
        // 获取节点链接
        const link = node.getData('link');
        if(link) {
            // 如果是ctrl/cmd点击,则在新窗口打开
            if(event.ctrlKey || event.metaKey) {
                this.app.workspace.openLinkText(link, '', true);
            } else {
                // 否则在当前窗口打开
                this.app.workspace.openLinkText(link, '');
            }
        }
        this.noteContext = node.getData('note');
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (view) {
            view.editor.blur();
        }
    },
    setLink() {
        this.app.workspace.trigger(EVENT_APP_MIND_NODE_LINK);
    },


    
  },
  beforeDestroy() {
    if(this.resizeTimer) {
      clearTimeout(this.resizeTimer);
    }
  }
}
</script>

<style  lang="less" scoped>
.mindToolsBox {
  position: absolute;
  background-color: #fff;
  top: 10px;
  right: 20px;
  cursor: pointer;
  user-select: none;

  &.isDark {
    background-color: #262a2e;
  }
  .toolsButton{
    //margin-left: 10px;
    padding-left: 8px;
    padding-right:8px;
    float: left;
    line-height: 25px;
    text-align:center;
    font-size: smaller;
    border-radius: 4px;
    border: 1px solid #eee;
  }
}
.remarkDiv{
  position: absolute;
  //background-color: #fff;
  top: 40px;
  right: 20px;
  cursor: pointer;
  user-select: none;
  width:100%;

  .remarkTextarea{
    height: 100px;
    width: 400px;
  }
  .remarkButton{
    //margin-left: 10px;
    padding-left: 10px;
    padding-right:10px;
    float: left;
    width: 50px;
    line-height: 25px;
    text-align:center;
    font-size: small;
    border-radius: 4px;
    border: 1px solid #eee;
  }
}
.custom-input-suggestion {
    border-bottom: 1px solid var(--background-modifier-border);
    margin-bottom: 5px;
    padding-bottom: 5px;
    color: var(--text-accent);
  }
</style>
