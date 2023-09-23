<template>
  <div>
    <!--<span>{{mydata.compId}}</span>-->
    <div id="mindMapContainer" :style="{ height: mydata.initHeight,width:mydata.mindMapContainerWidth }"></div>
    <div id="miniMap" v-if="showMiniMap"></div>
    <div id="mindTools" v-if="showMindTools" @remakModelToggle="remakModelToggle"></div>
    <NodeNoteContentShow :app="app" :mindMap="mindMap" :contentEl="contentEl" v-if="noteMode != 'slide'"></NodeNoteContentShow>
    <div id="node" v-if="noteMode === 'slide'">
      <div id="remarkDiv" class="remarkDiv" :style="{ height: mydata.initHeight }">
        <textarea id="nodeNote" v-model="remarkContent" class="remarkTextarea">111</textarea>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import {
  createApp,
  defineComponent,
  ref,
  onMounted,
  onUnmounted,
  shallowRef,
  reactive,
  provide,
  inject,
  nextTick
} from "vue";
import MindMap from "simple-mind-map";
import Drag from "simple-mind-map/src/plugins/Drag.js"
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import MiniMap from 'simple-mind-map/src/plugins/MiniMap.js'
import {WorkspaceLeaf} from "obsidian";
import {EVENT_APP_EMBEDDED_RESIZE, EVENT_APP_REFRESH, MARKMIND_DEFAULT_DATA} from "../constants/constant";
import _ from "lodash";
import Navigator from 'Navigator.vue'
import MindTools from 'Tools.vue'
import NodeNoteContentShow from 'NodeNoteContentShow.vue'
import { keyMap } from 'simple-mind-map/src/core/command/keyMap.js'
import TextEdit from 'simple-mind-map/src/core/render/TextEdit'


const THROTTLE_TIME_MILLIS = 3000;

export default {
  name: 'NodeNoteContentShow',
  components: {
    Navigator,
    MindTools,
    NodeNoteContentShow
  },
  props: {
    mindFile: {
      required: false
    },
    initMindData: {
      required: false
    },
    mindContainerId: {
      required: true
    },
    app: {
      required: false
    },
    //embedded-edit、edit、preview
    mode: {
      required: false
    },
    noteMode:{
      required:false
    },
    initElementHeight: {
      required: false
    },
    showMiniMap: {
      required: false,
      default: () => false
    },
    showMindTools: {
      required: false,
      default: () => false
    },
    contentEl: {
      required: false
    },
    leaf: {
      required: true
    }
  },
  data() {
    return {
      mydata: {
        mindMapData: MARKMIND_DEFAULT_DATA,
        compId: 0.0,
        mindMode: 'edit',
        mindTheme: 'dark',
        initHeight: '1000px',
        mindMapContainerWidth:'100%'
      },
      firstRender: true,
      mindMap:null,
      el_temp:null as Element,
      show: false,
      left: 0,
      top: 0,
    }
  },
  created() {
  },
  mounted() {
    this.mydata.compId = Math.random();
    this.mydata.initHeight = this.initElementHeight


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
    // debugger
    //设置样式
    // el_temp.style.width ='6000px'
    // el_temp.style.height ='6000px'
    //注册拖拽节点
    MindMap.usePlugin(Drag)
    //注册键盘导航
    MindMap.usePlugin(KeyboardNavigation)
    //注册小地图
    MindMap.usePlugin(MiniMap)
    // MindMap.usePlugin(RichText)
    // debugger;
    this.mindMap = new MindMap({
      el: this.el_temp,
      //主题：logicalStructure（逻辑结构图）、mindMap（思维导图）、organizationStructure（组织结构图）、catalogOrganization（目录组织图）、timeline（时间轴）、timeline2（时间轴2）、fishbone（鱼骨图）、verticalTimeline（v0.6.6+竖向时间轴）
      layout: 'mindMap',
      theme: this.mydata.mindTheme,
      //允许拖拽
      enableFreeDrag: true,
      readonly: this.mydata.mindMode === 'preview' ? true : false,
      // initRootNodePosition: ['center', 'center'],
      mousewheelAction: 'move',// zoom（放大缩小）、move（上下移动）
      data: this.mydata.mindMapData,
      customNoteContentShow: {
        show: (content, left, top) => {
          this.app.workspace.trigger('showNoteContent', content, left, top)
        },
        hide: () => {
          // this.$bus.$emit('hideNoteContent')
        }
      },
    });

    const textEdit = this.mindMap.renderer.textEdit
    this.mindMap.keyCommand.addShortcut('Spacebar', () => {
      console.log("触发空格")
      if (this.mindMap.renderer.activeNodeList.length <= 0) {
        return
      }
      textEdit.show(this.mindMap.renderer.activeNodeList[0])
    })

    this.mindMap.on('node_tree_render_end', (...args) => {
      // updateMiniMap();
      if (this.firstRender) {
        this.goTargetRoot();
        // debugger
        console.log("定位根节点")
        this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
      }
      this.firstRender = false;
    })
    // debugger
    //监控导图数据变更事件
    this.mindMap.on('data_change', (...args) => {
      this.throttleSave(args[0]);
    })
    this.mindMap.on('view_theme_change', (...args) => {
      console.log("样式调整mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)")
      this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
    })

    let nodeNoteEl = this.contentEl.querySelector('#nodeNote');
    this.mindMap.on("node_active",(node)=>{
      if (!node) {
        return
      }

      if (nodeNoteEl) {
        nodeNoteEl.value=node.getData('note');
      }
    })

    if (nodeNoteEl) {
      nodeNoteEl.addEventListener('input', function(event) {
        console.log("监听input")
        // throttleSaveNote();
        this.saveNote();
        // 处理输入事件，使用获取到的 value ...
      });

    }

    //监听刷新事件，刷新视图
    this.app.workspace.on(
        EVENT_APP_REFRESH,
        this.handleRefreshEvent
    );

    this.app.workspace.on('resize', () => {
      // debugger;
      this.mindResize();
    })

    //嵌入模式动态修改容器尺寸事件
    this.app.workspace.on(EVENT_APP_EMBEDDED_RESIZE, (leaf: WorkspaceLeaf)=>{
      //是当前页面，且是嵌入模式
      if (this.leaf.id === leaf.id && this.mode==='embedded-edit') {
        this.mindResize();
      }
    })

    this.app.workspace.on("css-change", () => {
      const el = document.querySelector("body");
      //是否深色模式
      if (el?.className.includes("theme-dark") ?? false) {
        this.mindMap.setTheme('dark')
      } else {
        this.mindMap.setTheme('default')
      }
    }, this.app)

    this.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
      if (!leaf) return;
      if (this.leaf.id === leaf.id) {
        this.mindResize();
      }
    })


    // debugger
    //渲染小地图
    if (this.showMiniMap) {
      createApp(Navigator, {
        mindMap: this.mindMap,
        app: this.app,
        contentEl: this.contentEl
      }).mount(this.contentEl.querySelector("#miniMap"));
    }
    //渲染工具栏
    if (this.showMindTools){
      createApp(MindTools, {
        mindMap: this.mindMap,
        app: this.app,
        contentEl: this.contentEl
      }).mount(this.contentEl.querySelector("#mindTools"));
    }
  },
  beforeDestroy() {

  },
  methods: {
    /**
     * 尺寸重置
     */
    mindResizeAndCenter(){
      this.mindMap.resize();
      this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
    },
    mindResize(){
      console.log('resize:' + this.mydata.compId)
      if (!this.el_temp) {
        return
      }
      //视窗大小为0，说明焦点不在当前页面，不重置大小（思维导图的尺寸定位是根据视窗大小来的，如果焦点不在当前页面，视窗获取到的宽度和高度就是0）
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
      this.mindMap.renderer.activeNodeList[0].setNote(this.contentEl.querySelector('#nodeNote').value);
    },
    handleRefreshEvent(newCompId, newMindData, newFilePath){
      console.log("准备刷新：" + this.mydata.compId)
      //如果组件id不一样且文件是同一个，重新渲染，以保证相同文件在其他视图的数据也被修改了
      if (this.mydata.compId !== newCompId && newFilePath === this.mindFile.path) {
        console.log('监听到其他视图的刷新事件：当前视图id：' + this.mydata.compId + ",其他视图：" + newCompId)
        if (JSON.stringify(this.mindMap.getData(false)) === JSON.stringify(newMindData)) {
          console.log("数据相等，不重新渲染")
          this.mindMap.reRender()
        } else {
          console.log("触发刷新，当前视图id：" + this.mydata.compId)
          //这里不能直接用setData方法，会导致循环依赖保存
          // mindMap.setData(newMindData)

          this.mindMap.execCommand('CLEAR_ACTIVE_NODE')
          this.mindMap.command.clearHistory()
          this.mindMap.renderer.renderTree = newMindData;
          this.mindMap.reRender(() => {
          }, 'setData')

        }
      }
    },
    offListener(){
      this.app.workspace.off(EVENT_APP_REFRESH);
      this.app.workspace.off(EVENT_APP_EMBEDDED_RESIZE);
      this.app.workspace.off('resize');
      this.app.workspace.off("css-change")
      this.app.workspace.off("quick-preview")
      this.app.workspace.off("active-leaf-change")

      this.app.workspace.off("showNoteContent")
      this.app.workspace.off("hideNoteContent")
      this.app.workspace.off("node_active")
    },
    throttleSave(mindDataTempParam: {}){
      _.throttle((mindDataTempParam) => {
        //保存文件
        this.app.vault.modify(this.mindFile, JSON.stringify(mindDataTempParam));
        //触发刷新事件用于通知其他视图刷新
        this.app.workspace.trigger(EVENT_APP_REFRESH, this.mydata.compId, mindDataTempParam, this.mindFile.path);
      }, THROTTLE_TIME_MILLIS);
    },

  }
}


</script>

<style scoped>
/* @import "./simpleMindMap.esm.css"; */

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

  .remarkTextarea{
    height: 100%;
    width: 100%
  }
  .remarkButton{
  /*margin-left: 10px;*/
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
</style>