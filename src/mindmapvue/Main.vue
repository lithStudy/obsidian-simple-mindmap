<template>
  <div class="mind-map-root-container">
<!--    <span>{{mydata.compId}}</span>-->
    <div id="mindMapContainer" ref="mindMapContainer" :style="{ height: mydata.initHeight,width:mydata.mindMapContainerWidth }"></div>
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
                :mindFile="mindFile"
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
        <textarea 
          id="nodeNote"  
          class="remarkTextarea" 
          v-model="noteContext" 
          @input="handleTextareaInput"
          @focus="handleTextareaForFocus"
          @blur="handleTextareaForBlur"
          @keydown="handleTextareaKeydown"
          @keydown.esc="handleTextareaEsc">
        </textarea>
        
        <!-- 添加文件建议列表 -->
        <div v-if="showFileSuggestions" 
             class="file-suggestions" 
             :style="suggestionPosition">
          <div v-for="(file, index) in filteredFiles" 
               :key="file.path"
               :class="['suggestion-item', { active: index === activeIndex }]"
               @click="selectFile(file)"
               @mouseenter="activeIndex = index">
            {{ file.basename }}
          </div>
        </div>
      </div>
    </div>
    <!-- <NodeNote></NodeNote> -->

  </div>
</template>

<script lang="ts">
// 添加自定义文件类型接口
interface CustomFile extends TFile {
  isCustomInput?: boolean;
}

import {  
  reactive,
  onMounted
} from "vue";
import MindMap from "simple-mind-map";
import Drag from "simple-mind-map/src/plugins/Drag.js";
import KeyboardNavigation from "simple-mind-map/src/plugins/KeyboardNavigation.js";
import MiniMap from "simple-mind-map/src/plugins/MiniMap.js";
import Export from "simple-mind-map/src/plugins/Export.js";
import ExportPDF from "simple-mind-map/src/plugins/ExportPDF.js";
import {EventRef, TFile,MarkdownView, WorkspaceLeaf} from "obsidian";
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
  SAVE_THROTTLE_TIME_MILLIS,
  EVENT_APP_MIND_NODE_LINK
} from "../constants/constant";
import _ from "lodash";
import Navigator from 'Navigator.vue'
import MindTools from 'Tools.vue'
import NodeNote from 'NodeEdit.vue'
import NodeNoteContentShow from 'NodeNoteContentShow.vue'
import { MARKMIND_DEFAULT_REAL_DATA} from "../utils/mind-content-util";
import { generateUniqueId } from '../utils/utils';
import { FileSuggestModal } from "../utils/file-suggest-modal";


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
      firstRender: true,
      noteMode: 'slide',
      noteContext: '',
      showFileSuggestions: false,
      files: [] as TFile[],
      filteredFiles: [] as TFile[],
      activeIndex: 0,
      suggestionPosition: {
        top: '0px',
        left: '0px'
      },
      currentInputPos: 0,
      searchText: '',
      eventRefs: {},
      // 添加防抖的文件搜索
      debouncedSearch: _.debounce(function(this: any, query: string) {
        if (!query) {
          this.filteredFiles = [];
          return;
        }
        this.files = this.app.vault.getFiles();
        this.filteredFiles = this.files
          .filter(file => file.basename.toLowerCase().includes(query.toLowerCase()))
          .slice(0, 10);
      }, 200),
      initRetryCount: 0
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
    // 使用nextTick确保DOM已完全渲染
    this.$nextTick(() => {
      console.log("DOM已渲染完成，开始初始化思维导图");
      //初始化
      this.initMindDataRef();
      
      // 确保mindMap已经初始化后再添加事件监听
      let retryCount = 0;
      const maxRetries = 10; // 最大重试次数
      
      const setupEventListeners = () => {
        if (!this.mindMap) {
          retryCount++;
          if (retryCount > maxRetries) {
            console.error("mindMap初始化失败，已达到最大重试次数");
            return;
          }
          console.log(`mindMap尚未初始化，等待初始化完成...（${retryCount}/${maxRetries}）`);
          setTimeout(setupEventListeners, 500); // 增加延迟时间
          return;
        }
        
        console.log("mindMap初始化成功，设置事件监听");
        
        //快捷键
        this.keyDownMethod();

        //监听mind渲染结束事件
        this.mindMap.on(EVENT_MIND_NODE_RENDER_END, this.mindNodeRenderMethRef)
        //监听导图数据变更事件
        this.mindMap.on(EVENT_MIND_DATA_CHANGE, this.mindDataChangeMethRef)
        //监听主题修改
        this.mindMap.on(EVENT_MIND_THEME_CHANGE, this.themeChange)
        //监听节点激活
        this.mindMap.on(EVENT_MIND_NODE_ACTIVE, this.mindNodeActive)


        // 初始化事件引用对象
        this.eventRefs = {};
        // 监听刷新事件，刷新视图
        // this.eventRefs.refreshMethodRef = this.app.workspace.on(EVENT_APP_MIND_REFRESH, this.refreshMethodRef);
        //监听尺寸调整
        this.eventRefs.mindResize = this.app.workspace.on(EVENT_APP_RESIZE, this.mindResize);
        //监听嵌入模式动态修改容器尺寸事件
        this.eventRefs.embedResizeMethodRef = this.app.workspace.on(EVENT_APP_MIND_EMBEDDED_RESIZE, this.embedResizeMethodRef);
        //跟随obsidian样式
        this.eventRefs.cssChangeMethRef = this.app.workspace.on(EVENT_APP_CSS_CHANGE, this.cssChangeMethRef, this.app);
        //监听obsidian窗口调整mind大小
        this.eventRefs.leafChangeActiveRef = this.app.workspace.on(EVENT_APP_LEAF_CHANGE_ACTIVE, this.leafChangeActiveRef);
        //监听备注输入框激活事件
        this.eventRefs.remarkInputActive = this.app.workspace.on(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE, this.remarkInputActive);
        //节点设置链接事件
        this.eventRefs.setNodeLink = this.app.workspace.on(EVENT_APP_MIND_NODE_LINK, this.setNodeLink);
      };
      
      // 开始设置事件监听
      setupEventListeners();
    });
  },
  unmounted(){
    console.log("Main.vue unmounted")
    this.offListener();
    //由于mindmap中有个匿名的window监听事件在监听快捷键可能导致快捷键操作被拦截，我没法销毁这个监听，只能将快捷键暂停
    this.mindMap.keyCommand.pause();
    
    // 移除快捷键监听
    this.mindMap.keyCommand.removeShortcut('Spacebar');
    
    this.mindMap.destroy();
    this.mindMap = null;

    // 清空事件引用
    this.eventRefs = {};
  },
  beforeDestroy() {
    console.log("Main.vue beforeDestroy")
  },
  methods: {
    initMindDataRef(){
      try {
        // 使用静态变量跟踪重试次数
        if (this.initRetryCount === undefined) {
          this.initRetryCount = 0;
        }
        const maxInitRetries = 5;
        
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
  
        // 使用Vue的ref获取DOM元素
        this.el_temp = this.$refs.mindMapContainer;
        
        // 确保el_temp存在
        if (!this.el_temp) {
          console.error("找不到mindMapContainer元素 (使用ref)");
          
          // 尝试使用querySelector作为备选方案
          this.el_temp = this.contentEl.querySelector("#mindMapContainer");
          
          if (!this.el_temp) {
            console.error("使用querySelector也找不到mindMapContainer元素");
            this.initRetryCount++;
            // 尝试等待一段时间后重新初始化，但有最大重试次数限制
            if (this.initRetryCount <= maxInitRetries) {
              console.log(`尝试重新初始化思维导图 (${this.initRetryCount}/${maxInitRetries})...`);
              setTimeout(() => {
                this.initMindDataRef();
              }, 800); // 增加延迟时间
            } else {
              console.error(`已达到最大重试次数(${maxInitRetries})，思维导图初始化失败`);
            }
            return;
          } else {
            console.log("通过querySelector找到了mindMapContainer元素");
          }
        }
  
        const elRect = this.el_temp.getBoundingClientRect()
        // 画布宽高
        const containerWidth = elRect.width
        const containerHeight = elRect.height
        if (containerWidth <= 0 || containerHeight <= 0){
          console.log(`不存在可用的画布容器，宽度: ${containerWidth}, 高度: ${containerHeight}`);
          this.initRetryCount++;
          // 尝试等待一段时间后重新初始化，但有最大重试次数限制
          if (this.initRetryCount <= maxInitRetries) {
            console.log(`尝试重新初始化思维导图 (${this.initRetryCount}/${maxInitRetries})...`);
            setTimeout(() => {
              this.initMindDataRef();
            }, 800); // 增加延迟时间
          } else {
            console.error(`已达到最大重试次数(${maxInitRetries})，思维导图初始化失败`);
          }
          return;
        }
        
        // 重置重试计数器，因为我们已经通过了初始检查
        this.initRetryCount = 0;
        
        // 确保MindMap类已正确加载
        if (typeof MindMap !== 'function') {
          console.error("MindMap类未正确加载");
          setTimeout(() => {
            this.initMindDataRef();
          }, 800);
          return;
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
        
        // 创建MindMap实例前记录日志
        console.log("准备创建MindMap实例，容器尺寸:", containerWidth, "x", containerHeight);
        
        this.mindMap = new MindMap({
          el: this.el_temp,
          //主题：logicalStructure（逻辑结构图）、mindMap（思维导图）、organizationStructure（组织结构图）、catalogOrganization（目录组织图）、timeline（时间轴）、timeline2（时间轴2）、fishbone（鱼骨图）、verticalTimeline（v0.6.6+竖向时间轴）
          layout: 'mindMap',
          theme: this.mydata.mindTheme,
          themeConfig: {},
          fit:true,
          //允许拖
          enableFreeDrag: true,
          readonly: this.mydata.mindMode === 'preview'||this.mydata.mindMode === 'embedded' ? true : false,
          // initRootNodePosition: ['center', 'center'],
          mousewheelAction: 'zoom',// zoom（放大缩小）、move（上下移动）
          mousewheelZoomActionReverse:true,
          data: this.mydata.mindMapData,
          customNoteContentShow: {
            show: (content, left, top) => {
              this.eventRefs.remarkPreview = this.app.workspace.trigger(EVENT_APP_MIND_NODE_REMARK_PREVIEW, content, left, top)
            },
            hide: () => {
            }
          },
          customHyperlinkJump:(url,node)=>{
            console.log("customHyperlinkJump",url,node)
            this.handleLink(url);
          }
          
        } as any);
        
        console.log("思维导图初始化成功");
      } catch (error) {
        console.error("初始化思维导图数据时出错:", error);
        
        // 出错时也增加重试计数
        if (this.initRetryCount === undefined) {
          this.initRetryCount = 0;
        }
        this.initRetryCount++;
        
        const maxInitRetries = 5;
        if (this.initRetryCount <= maxInitRetries) {
          console.log(`发生错误，尝试重新初始化思维导图 (${this.initRetryCount}/${maxInitRetries})...`);
          setTimeout(() => {
            this.initMindDataRef();
          }, 800); // 增加延迟时间
        } else {
          console.error(`已达到最大重试次数(${maxInitRetries})，思维导图初始化失败`);
        }
      }
    },
    // 处理链接
    handleLink(href, isNewWindow = true) {
        // 处理内部链接 [[文件名]]
        const wikiLinkMatch = href.match(/\[\[(.*?)\]\]/);
        if (wikiLinkMatch) {
            const path = wikiLinkMatch[1];
            this.openInternalLink(path, isNewWindow);
            return;
        }

        // 处理文件路径
        const file = this.app.metadataCache.getFirstLinkpathDest(href, '');
        if (file) {
            this.openInternalLink(file.path, isNewWindow);
            return;
        }

        // 处理外部链接
        window.open(href, '_blank');
    },

    // 打开内部链接
    openInternalLink(path, isNewWindow) {
        this.app.workspace.openLinkText(path, '', isNewWindow);
    },
    remarkInputActive(){
      console.log("remarkInputActive,"+this.mydata.compId)
      
      //存在活的节点时才继续
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
      console.log("mindNodeRenderMethRef:"+this.mydata.compId)
      if (this.firstRender) {

      }
      this.mindMapReady = true;
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
    // refreshMethodRef(newCompId, newMindData, newFilePath){
    //   console.log("监听到思维导图刷新事件，当前思维导图为：" + this.mydata.compId+"，通知刷新的思维导图为："+newCompId)
    //   if (!this.mindMap) {
    //     console.warn("MindMap instance not found, skipping refresh："+this.mydata.compId);
    //     return;
    //   }
    //   // return;
    //   //如果件id不一样且文件是同一个，重新渲染，以保证相同文件在其他视图的数据也被修改了
    //   if (this.mydata.compId !== newCompId && newFilePath === this.mindFile.path) {
    //     // console.log('监听到其他视图的刷新事件：当前视图id：' + this.mydata.compId + ",其他视图：" + newCompId)
    //     if (JSON.stringify(this.mindMap.getData(false)) === JSON.stringify(newMindData)) {
    //       // console.log("数据相等，不重新渲染")
    //       // this.mindMap.reRender()
    //     } else {
    //       // console.log("触发刷新，当前视图id：" + this.mydata.compId)
    //       //这里不能直接用setData方法，会导致循环依赖保存
    //       this.mindMap.renderer.setData(newMindData);
    //       this.mindMap.reRender()
    //     }
    //   }
    // },
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
      if(!this.contentEl) return;
      // debugger
      // 获取父容器和子元素
      const parentElement = this.contentEl.parentElement
      const childElement = this.contentEl.querySelector('#mindMapContainer');
      if(!parentElement || !childElement) return;
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
   
    mindResize(){
      if (!this.mindMap) {
        console.warn("MindMap instance not found, skipping mindResize"+this.mydata.compId);
        return;
      }
      if (!this.el_temp) {
        return
      }
      console.log('mindResize:' + this.mydata.compId)
      //视窗大小为0，说明焦点不在当前页面，不重置大小（思维导图的尺寸定位根据视窗大小来的，如果焦点不在当前页面，视窗获取到的宽度和高度就是0）
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
      //重置思维图尺寸
      this.mindResizeAndCenter();
    },
     /**
     * 尺寸重置
     */
     mindResizeAndCenter(){
      this.mindMap.resize();
      // this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
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
      console.log("offListener....")
      // debugger
      //关闭mindmap实例的监听事件
      this.mindMap.off(EVENT_MIND_NODE_RENDER_END, this.mindNodeRenderMethRef)
      //监控导图数据变更事件
      this.mindMap.off(EVENT_MIND_DATA_CHANGE, this.mindDataChangeMethRef)
      //监听主题修改
      this.mindMap.off(EVENT_MIND_THEME_CHANGE, this.themeChange)
      //监听节点激活
      this.mindMap.off(EVENT_MIND_NODE_ACTIVE, this.mindNodeActive)

      //关闭obsidin级别监听事件
      // this.app.workspace.off(EVENT_APP_MIND_REFRESH, this.refreshMethodRef);
      this.app.workspace.off(EVENT_APP_RESIZE, this.mindResize);
      this.app.workspace.off(EVENT_APP_MIND_EMBEDDED_RESIZE, this.embedResizeMethodRef);
      this.app.workspace.off(EVENT_APP_CSS_CHANGE, this.cssChangeMethRef, this.app);
      // this.app.workspace.off(EVENT_APP_CSS_CHANGE, this.cssChangeMethRef);
      this.app.workspace.off(EVENT_APP_LEAF_CHANGE_ACTIVE, this.leafChangeActiveRef);
      this.app.workspace.off(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE, this.remarkInputActive);
      this.app.workspace.off(EVENT_APP_MIND_NODE_LINK, this.setNodeLink);
      // this.app.workspace.offref(this.eventRefs.refreshMethodRef)
      // this.app.workspace.offref(this.eventRefs.mindResize)
      // this.app.workspace.offref(this.eventRefs.embedResizeMethodRef)
      // this.app.workspace.offref(this.eventRefs.cssChangeMethRef)
      // this.app.workspace.offref(this.eventRefs.leafChangeActiveRef)
      // this.app.workspace.offref(this.eventRefs.remarkInputActive)
      // this.app.workspace.offref(this.eventRefs.setNodeLink)
    },
    throttleSave: _.throttle(function (mindDataTempParam){
        console.log("准备保存：throttle:")
        this.app.vault.modify(this.mindFile, JSON.stringify(mindDataTempParam));
        // this.mydata.mindMapData = mindDataTempParam;
        // //触发刷新事件用于通知其他视图刷新
        // this.app.workspace.trigger(EVENT_APP_MIND_REFRESH, this.mydata.compId, mindDataTempParam, this.mindFile.path);
      }, SAVE_THROTTLE_TIME_MILLIS),
    // 优化文件搜索方法
    handleTextareaInput(event) {
      const textarea = event.target;
      const value = textarea.value;
      const cursorPosition = textarea.selectionStart;
      
      const beforeText = value.slice(0, cursorPosition);
      const match = beforeText.match(/\[\[([^\]]*)$/);
      
      if (match) {
        this.searchText = match[1];
        this.showFileSuggestions = true;
        this.currentInputPos = cursorPosition;
        
        // 使用防抖的搜索方法
        this.debouncedSearch(this.searchText);
        
        this.updateSuggestionPosition(textarea);
        this.activeIndex = 0;
      } else {
        this.showFileSuggestions = false;
      }
      
      this.handleTextarea();
    },
    
    // 优化位置更新方法
    updateSuggestionPosition: _.throttle(function(textarea) {
      if (!textarea) return;
      
      const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
      const { top, left } = this.calculateSuggestionPosition(textarea, textBeforeCursor);
      
      this.suggestionPosition = {
        top: `${top + 20}px`,
        left: `${left}px`
      };
    }, 100),
    
    // 分离位置计算逻辑
    calculateSuggestionPosition(textarea, textBeforeCursor) {
      const temp = document.createElement('div');
      temp.style.cssText = window.getComputedStyle(textarea).cssText;
      temp.style.height = 'auto';
      temp.style.width = textarea.offsetWidth + 'px';
      temp.style.position = 'absolute';
      temp.style.visibility = 'hidden';
      temp.style.whiteSpace = 'pre-wrap';
      temp.style.wordWrap = 'break-word';
      temp.innerHTML = textBeforeCursor.replace(/\n/g, '<br>');
      
      document.body.appendChild(temp);
      
      const span = document.createElement('span');
      span.innerHTML = '.';
      temp.appendChild(span);
      
      const { offsetLeft: spanX, offsetTop: spanY } = span;
      document.body.removeChild(temp);
      
      return {
        top: spanY - textarea.scrollTop,
        left: Math.min(spanX, textarea.offsetWidth - 200)
      };
    },
    handleTextareaKeydown(event) {
      if (!this.showFileSuggestions) return;
      
      switch(event.key) {
        case 'ArrowDown':
          event.preventDefault();
          this.activeIndex = (this.activeIndex + 1) % this.filteredFiles.length;
          break;
        case 'ArrowUp':
          event.preventDefault();
          this.activeIndex = (this.activeIndex - 1 + this.filteredFiles.length) % this.filteredFiles.length;
          break;
        case 'Enter':
          event.preventDefault();
          if (this.filteredFiles[this.activeIndex]) {
            this.selectFile(this.filteredFiles[this.activeIndex]);
          }
          break;
      }
    },
    selectFile(file) {
      const beforeText = this.noteContext.slice(0, this.currentInputPos - this.searchText.length - 2);
      const afterText = this.noteContext.slice(this.currentInputPos);
      
      this.noteContext = beforeText + `[[${file.basename}]]` + afterText;
      this.showFileSuggestions = false;
      this.saveNote();
    },
    setNodeLink() {
        if (this.mindMap.renderer.activeNodeList.length <= 0) {
            return;
        }
        const node = this.mindMap.renderer.activeNodeList[0];
          
          // 打开文件选择器
        const fileModal = new FileSuggestModal(this.app);
        fileModal.setPlaceholder("输入文件名搜索，或输入自定义链接文本");
        
        // 重写getSuggestions方法，添加自定义输入选项
        const originalGetSuggestions = fileModal.getSuggestions.bind(fileModal);
        fileModal.getSuggestions = (query) => {
            const files = originalGetSuggestions(query) as CustomFile[];
            if (query && (!files.length || !files.some(file => file.basename.toLowerCase() === query.toLowerCase()))) {
                return [
                    {
                        isCustomInput: true,
                        basename: query,
                        path: `使用自定义文本: ${query}`
                    } as CustomFile,
                    ...files
                ];
            }
            return files;
        };
        // 重写renderSuggestion方法，为自定义输入添加特殊样式
        const originalRenderSuggestion = fileModal.renderSuggestion.bind(fileModal);
        fileModal.renderSuggestion = (file: CustomFile, el) => {
            if (file.isCustomInput) {
                el.createEl("div", { text: file.path });
                el.addClass("custom-input-suggestion");
            } else {
                originalRenderSuggestion(file, el);
            }
        };
        // 重写onChooseSuggestion方法
        fileModal.onChooseSuggestion = (file: CustomFile) => {
            if (file.isCustomInput) {
                node.setHyperlink(file.basename, file.basename);
            } else {
                console.log("选择文件", file);
                const fileName = file.basename;
                node.setHyperlink(`[[${fileName}]]`, fileName);
            }
        };
        fileModal.open();
        
    }
  }
}


</script>

<style scoped>
/* @import "./simpleMindMap.esm.css"; */
.mind-map-root-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.leftTop {
  position: absolute;
}

#mindMapContainer {
  width: 80%;
  min-width: 300px;
  min-height: 400px;
  float: left;
  transition: width 0.3s ease;
  position: relative;
}

#mindMapContainer * {
  margin: 0;
  padding: 0;
}

#node {
  width: 20%;
  float: left;
  transition: width 0.3s ease;
}

.remarkDiv {
  position: relative;
  height: 100%;
  background-color: var(--background-primary);
  border-left: 1px solid var(--background-modifier-border);
}

.remarkTextarea {
  height: 100%;
  width: 100%;
  padding: 10px;
  border: none;
  resize: none;
  background-color: var(--background-primary);
  color: var(--text-normal);
  font-family: var(--font-text);
  line-height: 1.5;
}

.remarkTextarea:focus {
  outline: none;
  box-shadow: inset 0 0 0 1px var(--background-modifier-border-focus);
}

.mind-map-wiki-link {
  color: var(--link-color);
  text-decoration: underline;
  cursor: pointer;
  transition: color 0.2s ease;
}

.mind-map-wiki-link:hover {
  color: var(--link-color-hover);
}

.file-suggestions {
  position: absolute;
  background: var(--background-primary);
  border: 1px solid var(--background-modifier-border);
  border-radius: 6px;
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  min-width: 200px;
  backdrop-filter: blur(10px);
}

.suggestion-item {
  padding: 8px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  color: var(--text-normal);
  transition: background-color 0.2s ease;
}

.suggestion-item.active {
  background-color: var(--background-modifier-hover);
}

.suggestion-item:hover {
  background-color: var(--background-modifier-hover);
}

/* 添加滚动条样式 */
.file-suggestions::-webkit-scrollbar {
  width: 6px;
}

.file-suggestions::-webkit-scrollbar-track {
  background: var(--background-primary);
}

.file-suggestions::-webkit-scrollbar-thumb {
  background: var(--background-modifier-border);
  border-radius: 3px;
}

.file-suggestions::-webkit-scrollbar-thumb:hover {
  background: var(--background-modifier-border-hover);
}

/* 自定义输入建议的样式 */
.custom-input-suggestion {
  font-style: italic;
  color: var(--text-muted);
}

/* 添加响应式布局 */
@media screen and (max-width: 768px) {
  #mindMapContainer {
    width: 100%;
    float: none;
  }
  
  #node {
    width: 100%;
    float: none;
    margin-top: 10px;
  }
  
  .remarkDiv {
    border-left: none;
    border-top: 1px solid var(--background-modifier-border);
  }
}
</style>