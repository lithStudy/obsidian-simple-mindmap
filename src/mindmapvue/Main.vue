<template>
  <div>
<!--    <span>{{mydata.compId}}</span>-->
    <div id="mindMapContainer" :style="{ height: mydata.initHeight,width:mydata.mindMapContainerWidth }"></div>
    <Navigator v-if="showMiniMap && mindMapReady"
               :mindMap="mindMap"
               :app="app"
               :contentEl="contentEl">
    </Navigator>

    <mind-tools v-if="showMindTools && mindMapReady"
                :mindMap="mindMap"
                :app="app"
                :contentEl="contentEl"
                :mode="mode"
                @remakModelToggle="remarkModelToggle"
    ></mind-tools>

    <NodeNoteContentShow
        :app="app"
        :mindMap="mindMap"
        :contentEl="contentEl"
        v-if="noteMode != 'slide' && mindMapReady">
    </NodeNoteContentShow>

    <div id="node" v-if="noteMode === 'slide'" >
      <div id="remarkDiv" class="remarkDiv" :style="{ height: mydata.initHeight }">
        <textarea id="nodeNote"  class="remarkTextarea" v-model="noteContext" 
          @input="handleTextarea"
          @focus="handleTextareaForFocus"
          @blur="handleTextareaForBlur"
          @keydown.esc="handleTextareaEsc">111</textarea>
      </div>
    </div>
    <!-- <NodeNote></NodeNote> -->

  </div>
</template>

<script lang="ts">
import {
  createApp,
  reactive,
  onMounted,
  onUnmounted,
  watch,
  ref,
  computed,
  nextTick,
  onBeforeUnmount
} from "vue";
import MindMap from "simple-mind-map";
// import { Drag,KeyboardNavigation,MiniMap,Export,ExportPDF } from "simple-mind-map/types/src/plugins";
import {EventRef, MarkdownView, WorkspaceLeaf} from "obsidian";
import {
  EVENT_APP_CSS_CHANGE,
  EVENT_APP_MIND_EMBEDDED_RESIZE,
  EVENT_APP_LEAF_CHANGE_ACTIVE,
  EVENT_APP_MIND_EXPORT,
  EVENT_MIND_NODE_ACTIVE,
  EVENT_APP_MIND_NODE_REMARK_PREVIEW,
  EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE,
  EVENT_APP_MIND_NODE_PRIORITY,
  EVENT_APP_QUICK_PREVIEW,
  EVENT_APP_MIND_REFRESH,
  EVENT_APP_RESIZE,
  EVENT_MIND_THEME_CHANGE,
  EVENT_MIND_DATA_CHANGE,
  EVENT_MIND_NODE_RENDER_END,
  SAVE_THROTTLE_TIME_MILLIS
} from "../constants/constant";
import _ from "lodash";
import Navigator from 'Navigator.vue'
import MindTools from 'Tools.vue'
import NodeNote from 'NodeEdit.vue'
import NodeNoteContentShow from 'NodeNoteContentShow.vue'
// import { keyMap } from 'simple-mind-map/src/core/command/keyMap.js'
// import TextEdit from 'simple-mind-map/src/core/render/TextEdit'

import { MARKMIND_DEFAULT_REAL_DATA} from "../utils/mind-content-util";
import { debounce } from 'lodash';
import { generateUniqueId } from '../utils/utils';

const plugins = MindMap.definePlugins();
const { Drag, KeyboardNavigation, MiniMap, Export, ExportPDF } = plugins;

// 在文件开头添加这个接口扩展
declare module "obsidian" {
    interface WorkspaceLeaf {
        id: string;
    }
}

export default {
  name: 'SimpleMindMap',
  components: {
    Navigator,
    MindTools,
    NodeNoteContentShow,
    NodeNote
  },
  props: {
    mindFile: Object,
    initMindData: Object,
    mindContainerId: {
      type: String,
      required: true
    },
    app: Object,
    mode: {
      type: String,
      default: 'edit',
      validator: (value: string) => {
        return ['embedded', 'edit', 'preview'].includes(value)
      }
    },
    initNoteMode: String,
    initElementHeight: String,
    showMiniMap: {
      type: Boolean,
      default: false
    },
    showMindTools: {
      type: Boolean,
      default: false
    },
    contentEl: HTMLElement,
    leaf: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      mydata: reactive({
        mindMapData: MARKMIND_DEFAULT_REAL_DATA,
        compId: generateUniqueId(),
        mindMode: 'edit',
        mindTheme: 'dark',
        initHeight: '1000px',
        mindMapContainerWidth: '100%',
        noteContainerWidth: '20%'
      }),
      mindMap: null as MindMap | null,
      mindMapReady: false,
      noteMode: 'slide',
      noteContext: ''
    }
  },
  created() {
    this.mydata.initHeight = this.initElementHeight

    this.noteMode = this.initNoteMode;
    if (this.noteMode === 'slide') {
      this.mydata.mindMapContainerWidth='80%';
      this.mydata.noteContainerWidth='20%'
    }
  },
  mounted() {
    //初始化
    this.initMindDataRef();
    //快捷键
    this.keyDownMethod();

    //监听mind渲染结束事件
    this.mindMap.on(EVENT_MIND_NODE_RENDER_END, this.mindNodeRenderMethRef)
    //监听导图数据变更事件
    this.mindMap.on(EVENT_MIND_DATA_CHANGE, this.mindDataChangeMethRef)
    //监听主题修改
    this.mindMap.on(EVENT_MIND_THEME_CHANGE, this.themeChange)
    //监听节点激活
    this.mindMap.on(EVENT_MIND_NODE_ACTIVE,this.mindNodeActive)

    // 监听刷新事件，刷新视图
    this.app.workspace.on(EVENT_APP_MIND_REFRESH, this.refreshMethodRef);
    //监听尺寸调整
    this.app.workspace.on(EVENT_APP_RESIZE, this.mindResize)
    //监听嵌入模式动态修改容器尺寸事件
    this.app.workspace.on(EVENT_APP_MIND_EMBEDDED_RESIZE, this.embedResizeMethodRef)
    //跟随obsidian样式
    this.app.workspace.on(EVENT_APP_CSS_CHANGE, this.cssChangeMethRef, this.app)
    //监听obsidian窗口调整mind大小
    this.app.workspace.on(EVENT_APP_LEAF_CHANGE_ACTIVE,this.leafChangeActiveRef)
    //监听备注输入框激活事件
    this.app.workspace.on(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE, this.remarkInputActive)


    if(this.mindMap){
      this.mindMapReady = true;
      this.setPosition();
    }

  },
  unmounted(){
    console.log("Main.vue unmounted")
    this.offListener();
    //由于mindmap中有个匿名的window监听事件在监听快捷键可能导致快捷键操作被拦截，我没法销毁这个监听，只能将快捷键暂停
    this.mindMap.keyCommand.pause();
    // 移除所有事件监听
    this.mindMap.removeAllListeners();
    this.mindMap.destroy();

    this.mindMap=null;
  },
  beforeDestroy() {
    console.log("Main.vue beforeDestroy")
  },
  methods: {
    initMindDataRef(){
      this.mydata.compId = Math.random();
      this.mydata.mindMapData = {...this.mydata.mindMapData, ...this.initMindData};
      this.mydata.mindMode = this.mode || 'edit'

      const bodyEl = document.querySelector("body");
      //是否深色模式
      if (bodyEl?.className.includes("theme-dark") ?? false) {
        this.mydata.mindTheme = 'dark'
      } else {
        this.mydata.mindTheme = 'default'
      }

      this.el_temp = this.contentEl.querySelector("#mindMapContainer");

      const elRect = this.el_temp.getBoundingClientRect()
      // 画布宽高
      const containerWidth =elRect.width
      const containerHeight = elRect.height
      if (containerWidth <= 0 || containerHeight <= 0){
        console.log("不存在可用的画布容器")
        return
      }
      //册拖拽节点
      MindMap.usePlugin(Drag)
      //注册键盘导航
      MindMap.usePlugin(KeyboardNavigation)
      //注册小地图
      MindMap.usePlugin(MiniMap)
      //导出
      MindMap.usePlugin(Export)
      MindMap.usePlugin(ExportPDF)
      // MindMap.usePlugin(RichText)
      // debugger;
      this.mindMap = new MindMap({
        el: this.el_temp,
        //主题：logicalStructure（逻辑结构图）、mindMap（思维导图）、organizationStructure（组织结构图）、catalogOrganization（目录组织图）、timeline（时间轴）、timeline2（时间轴2）、fishbone（鱼骨图）、verticalTimeline（v0.6.6+竖向时间轴）
        layout: 'mindMap',
        theme: this.mydata.mindTheme,
        //允许拖拽
        enableFreeDrag: true,
        readonly: this.mydata.mindMode === 'preview'||this.mydata.mindMode === 'embedded' ? true : false,
        // initRootNodePosition: ['center', 'center'],
        mousewheelAction: 'zoom',// zoom（放大缩小）、move（上下移动）
        mousewheelZoomActionReverse:true,
        data: this.mydata.mindMapData,
        customNoteContentShow: {
          show: (content, left, top) => {
            this.app.workspace.trigger(EVENT_APP_MIND_NODE_REMARK_PREVIEW, content, left, top)
          },
          hide: () => {
          }
        },
      });
    },
    remarkInputActive(){
      //存在激活的节点时才继续
      if (this.mindMap.renderer.activeNodeList.length <= 0) {
        return
      }
      // 找到了指定的 textarea 元素，触发焦点
      const textareaElement = document.getElementById("nodeNote") as HTMLTextAreaElement;
      if (textareaElement) {
        textareaElement.focus();
      }
    },
    leafChangeActiveRef(leaf: WorkspaceLeaf){
      if (!leaf) return;
      console.log("EVENT_APP_LEAF_CHANGE_ACTIVE:"+leaf.id+" this:"+this.leaf.id)
      if (this.leaf.id === leaf.id) {
        this.mindResize();
      }
    },
    cssChangeMethRef(){
      const el = document.querySelector("body");
      //是否深色模式
      if (el?.className.includes("theme-dark") ?? false) {
        this.mindMap.setTheme('dark')
      } else {
        this.mindMap.setTheme('default')
      }
    },
    mindNodeRenderMethRef(...args){
      // updateMiniMap();
      if (this.firstRender) {
        this.goTargetRoot();
        // debugger
        console.log("定位根节点")
        this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
        this.mindMap.view.fit()
      }
      this.firstRender = false;
    },
    embedResizeMethodRef(leaf: WorkspaceLeaf){
      //是当前页，且是嵌入模式
      if (this.leaf.id === leaf.id && this.mode==='embedded') {
        this.mindResize();
      }
    },
    mindNodeActive(node){
      if (!node) {
        return
      }
      this.noteContext = node.getData('note');
      //移除外部焦点
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view) {
        view.editor.blur();
      }
    },
    mindDataChangeMethRef(...args) {
      this.throttleSave(args[0]);
    },
    themeChange(...args){
      console.log("样式调整mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)")
      this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
    },
    refreshMethodRef(newCompId, newMindData, newFilePath){
      console.log("监听到思维导图刷新事件，当前思维导图为：" + this.mydata.compId+"，通知刷新的思维导图为："+newCompId)
      // return;
      //如果件id不一样且文件是同一个，重新渲染，以保证相同文件在其他视图的数据也被修改了
      if (this.mydata.compId !== newCompId && newFilePath === this.mindFile.path) {
        // console.log('监听到其他视图的刷新事件：当前视图id：' + this.mydata.compId + ",其他视图：" + newCompId)
        if (JSON.stringify(this.mindMap.getData(false)) === JSON.stringify(newMindData)) {
          // console.log("数据相等，不重新渲染")
          this.mindMap.reRender()
        } else {
          // console.log("触发刷新，当前视图id：" + this.mydata.compId)
          //这里不能直接用setData方法，会导致循环依赖保存
          // this.mindMap.setData(newMindData)

          this.mindMap.execCommand('CLEAR_ACTIVE_NODE')
          this.mindMap.command.clearHistory()
          this.mindMap.renderer.renderTree = newMindData;
          this.mindMap.reRender(() => {
          }, 'setData')

        }
      }
    },
    keyDownMethod(){
      const textEdit = this.mindMap.renderer.textEdit
      this.mindMap.keyCommand.addShortcut('Spacebar', () => {
        console.log("触发空格")
        if (this.mindMap.renderer.activeNodeList.length <= 0) {
          return
        }
        textEdit.show({node:this.mindMap.renderer.activeNodeList[0]})
      })
    },
    handleTextarea(){
      this.saveNote();
    },
    handleTextareaForFocus(){
      this.mindMap.keyCommand.pause();
      console.log("获取焦点，暂停快捷键")
    },
    handleTextareaForBlur(){
      this.mindMap.keyCommand.recovery();
      console.log("失去焦点，恢复快捷键")
    },
    handleTextareaEsc(event){
      if (event.key === 'Escape') {
        event.target.blur();
      }
    },
    setPosition() {
      // debugger
      // 获取父容器和子元素
      const parentElement = this.contentEl.parentElement
      const childElement = this.contentEl.querySelector('#mindMapContainer');
      // 获取子元素相对于父容器的位置信息
      const parentRect = parentElement.getBoundingClientRect();
      const childRect = childElement.getBoundingClientRect();

      const relativeLeft = childRect.left - parentRect.left;
      const relativeTop = childRect.top - parentRect.top;

      this.left = relativeLeft
      this.top = relativeTop
    },
    remarkModelToggle(remarkMode){
      if(this.noteMode==='slide'){
        this.noteMode='notSlide';
        this.mydata.mindMapContainerWidth='100%';
      }else {
        this.noteMode='slide';
        this.mydata.mindMapContainerWidth='80%';
      }

      setTimeout(()=> {
        // debugger
        this.mindMap.resize();
      }, 10);

    },
    /**
     * 尺寸重置
     */
    mindResizeAndCenter(){
      this.mindMap.resize();
      // this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
    },
    mindResize(){
      console.log('resize:' + this.mydata.compId)
      if (!this.el_temp) {
        return
      }
      //视窗大小为0，说明焦点��在当前页面，不重置大小（思维导图的尺寸定位根据视窗大小来的，如果焦点不在当前页面，视窗获取到的宽度和高度就是0）
      const elRect = this.el_temp.getBoundingClientRect()
      const widthTemp = elRect.width
      const heightTemp = elRect.height
      if (heightTemp <= 0 || widthTemp <= 0) {
        return;
      }
      // debugger

      //计算尺寸变更后的容器大小
      const paddingTop = parseFloat(getComputedStyle(this.contentEl).paddingTop);
      const paddingBottom = parseFloat(getComputedStyle(this.contentEl).paddingBottom);
      let heightWithoutPadding = this.contentEl.clientHeight - paddingTop - paddingBottom;
      this.mydata.initHeight=heightWithoutPadding+"px";
      //重置思维导图尺寸
      this.mindResizeAndCenter();
    },
    goTargetRoot(){
      this.mindMap.execCommand('GO_TARGET_NODE', this.mindMap.renderer.root, () => {
        //定位完成后的回调函数
        // this.notHandleDataChange = false
      })
    },
    saveNote(){
      if (this.mindMap.renderer.activeNodeList.length <= 0) {
        return
      }
      this.mindMap.renderer.activeNodeList[0].setNote(this.noteContext);
    },
    offListener(){
      //这个会把所有的实例的监听都销毁
      console.log("offListener....")
      // debugger
      //监听mind渲染结束事件
      // this.mindMap.on(EVENT_MIND_NODE_RENDER_END, this.mindNodeRenderMethRef)
      //监控导图数据变更事件
      this.mindMap.off(EVENT_MIND_DATA_CHANGE, this.mindDataChangeMethRef)
      //监听主题修改
      this.mindMap.off(EVENT_MIND_THEME_CHANGE, this.themeChange)
      //监听节点激活
      this.mindMap.off(EVENT_MIND_NODE_ACTIVE,this.mindNodeActive)

      // 监听刷新事件，刷新视图
      this.app.workspace.off(EVENT_APP_MIND_REFRESH, this.refreshMethodRef);
      //监听尺寸调整
      this.app.workspace.off(EVENT_APP_RESIZE, this.mindResize)
      //嵌入模式动态修改容器尺寸事件
      this.app.workspace.off(EVENT_APP_MIND_EMBEDDED_RESIZE, this.embedResizeMethodRef)
      //跟随obsidian样式
      this.app.workspace.off(EVENT_APP_CSS_CHANGE, this.cssChangeMethRef, this.app)
      //监控obsidian窗口调整mind大小
      this.app.workspace.off(EVENT_APP_LEAF_CHANGE_ACTIVE,this.leafChangeActiveRef)
      //监听备注输入框激活事件
      this.app.workspace.off(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE, this.remarkInputActive)
    },
    throttleSave: _.throttle(function (mindDataTempParam){
        console.log("准备保存：throttle:")
        this.app.vault.modify(this.mindFile, JSON.stringify(mindDataTempParam));
        this.mydata.mindMapData = mindDataTempParam;
        //触发刷新事件用于通知其他视图刷新
        this.app.workspace.trigger(EVENT_APP_MIND_REFRESH, this.mydata.compId, mindDataTempParam, this.mindFile.path);
      }, SAVE_THROTTLE_TIME_MILLIS),

  }
}


</script>

<style scoped>
/* @import "./simpleMindMap.esm.css"; */
.leftTop{
  position: absolute;
}
#mindMapContainer {
  width: 80%;
  float: left;
  /* min-height: 400px; */
  /* height: 100%; */
  /* height: 2000px; */
}

#mindMapContainer * {
  margin: 0;
  padding: 0;
}

#node{
  width: 20%;
  float: left;
}

.remarkDiv{
  /*position: absolute;*/
  /*background-color: #fff;*/
  /*top: 40px;*/
  /*right: 20px;*/
  cursor: pointer;
  user-select: none;

}
.remarkTextarea{
    height: 100%;
    width: 100%
}
</style>