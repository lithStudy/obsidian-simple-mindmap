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

export default defineComponent({
  name: "SampleSettingTabPage",
  components: {
    Navigator,
    MindTools,
    NodeNoteContentShow
  },
  // props: ['mindFile','initMindData','app','mode','initElementHeight'],
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
  setup(props) {
    // let mindMap = ref({})
    // provide('mindMap', mindMap);

    let mindMap = null;

    let el_temp = null;



    const remakModelToggle=()=>{
      console.log('remakModelToggle');
    }

    const mindResizeAndCenter = () => {
      // console.log("定位根节点")
      mindMap.resize();
      mindMap.renderer.moveNodeToCenter(mindMap.renderer.root)
    }

    const mindResize = () => {
      console.log('resize:' + mydata.compId)
      if (!el_temp) {
        return
      }
      //视窗大小为0，说明焦点不在当前页面，不重置大小（思维导图的尺寸定位是根据视窗大小来的，如果焦点不在当前页面，视窗获取到的宽度和高度就是0）
      const elRect = el_temp.getBoundingClientRect()
      const widthTemp = elRect.width
      const heightTemp = elRect.height
      if (heightTemp <= 0 || widthTemp <= 0) {
        return;
      }
      // debugger

      //计算尺寸变更后的容器大小
      const paddingTop = parseFloat(getComputedStyle(props.contentEl).paddingTop);
      const paddingBottom = parseFloat(getComputedStyle(props.contentEl).paddingBottom);
      let heightWithoutPadding = props.contentEl.clientHeight - paddingTop - paddingBottom;
      mydata.initHeight=heightWithoutPadding+"px";
      //重置思维导图尺寸
      mindResizeAndCenter();

    }



    console.log("aaaaa-----initElementHeight:" + props.initElementHeight)

    // const message = ref(props.initMindData)
    let firstRender = true;
    // console.log('ddddd:'+props.initMindData)

    // const app = this.app;

    const mydata = reactive({
      mindMapData: MARKMIND_DEFAULT_DATA,
      compId: 0.0,
      mindMode: 'edit',
      mindTheme: 'dark',
      initHeight: '1000px',
      mindMapContainerWidth:'100%'
    })
    mydata.compId = Math.random();
    mydata.initHeight = props.initElementHeight


    const goTargetRoot = () => {
      mindMap.execCommand('GO_TARGET_NODE', mindMap.renderer.root, () => {
        //定位完成后的回调函数
        // this.notHandleDataChange = false
      })
    }

    const saveNote=()=>{
      if (mindMap.renderer.activeNodeList.length <= 0) {
        return
      }
      mindMap.renderer.activeNodeList[0].setNote(props.contentEl.querySelector('#nodeNote').value);
    }

    const throttleSaveNote = _.throttle(() => {
      saveNote();
    }, THROTTLE_TIME_MILLIS);

    const handleRefreshEvent = (newCompId, newMindData, newFilePath) => {
      console.log("准备刷新：" + mydata.compId)
      //如果组件id不一样且文件是同一个，重新渲染，以保证相同文件在其他视图的数据也被修改了
      if (mydata.compId !== newCompId && newFilePath === props.mindFile.path) {
        console.log('监听到其他视图的刷新事件：当前视图id：' + mydata.compId + ",其他视图：" + newCompId)
        if (JSON.stringify(mindMap.getData(false)) === JSON.stringify(newMindData)) {
          console.log("数据相等，不重新渲染")
          mindMap.reRender()
        } else {
          console.log("触发刷新，当前视图id：" + mydata.compId)
          //这里不能直接用setData方法，会导致循环依赖保存
          // mindMap.setData(newMindData)

          mindMap.execCommand('CLEAR_ACTIVE_NODE')
          mindMap.command.clearHistory()
          mindMap.renderer.renderTree = newMindData;
          mindMap.reRender(() => {
          }, 'setData')

        }
      }
    };

    const offListener = () => {
      props.app.workspace.off(EVENT_APP_REFRESH);
      props.app.workspace.off(EVENT_APP_EMBEDDED_RESIZE);
      props.app.workspace.off('resize');
      props.app.workspace.off("css-change")
      props.app.workspace.off("quick-preview")
      props.app.workspace.off("active-leaf-change")

      props.app.workspace.off("showNoteContent")
      props.app.workspace.off("hideNoteContent")
      // props.app.workspace.off("node_active")
    }


    // 在组件挂载时调用 updateMiniMap 函数
    onMounted(() => {
      if(props.noteMode==='slide'){
        mydata.mindMapContainerWidth='80%';

      }
      //节流保存数据
      const throttleSave = _.throttle((mindDataTempParam: {}) => {
        //保存文件
        props.app.vault.modify(props.mindFile, JSON.stringify(mindDataTempParam));
        //触发刷新事件用于通知其他视图刷新
        props.app.workspace.trigger(EVENT_APP_REFRESH, mydata.compId, mindDataTempParam, props.mindFile.path);
      }, THROTTLE_TIME_MILLIS);

      nextTick(() => {
        mydata.mindMapData = {...mydata.mindMapData, ...props.initMindData};
        mydata.mindMode = props.mode || 'edit'

        const bodyEl = document.querySelector("body");
        //是否深色模式
        if (bodyEl?.className.includes("theme-dark") ?? false) {
          mydata.mindTheme = 'dark'
        } else {
          mydata.mindTheme = 'default'
        }

        el_temp = props.contentEl.querySelector("#mindMapContainer");
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
        mindMap = new MindMap({
          el: el_temp,
          //主题：logicalStructure（逻辑结构图）、mindMap（思维导图）、organizationStructure（组织结构图）、catalogOrganization（目录组织图）、timeline（时间轴）、timeline2（时间轴2）、fishbone（鱼骨图）、verticalTimeline（v0.6.6+竖向时间轴）
          layout: 'mindMap',
          theme: mydata.mindTheme,
          //允许拖拽
          enableFreeDrag: true,
          readonly: mydata.mindMode === 'preview' ? true : false,
          // initRootNodePosition: ['center', 'center'],
          mousewheelAction: 'move',// zoom（放大缩小）、move（上下移动）
          data: mydata.mindMapData,
          customNoteContentShow: {
            show: (content, left, top) => {
              props.app.workspace.trigger('showNoteContent', content, left, top)
            },
            hide: () => {
              // this.$bus.$emit('hideNoteContent')
            }
          },
        });

        const textEdit = mindMap.renderer.textEdit
        mindMap.keyCommand.addShortcut('Spacebar', () => {
          console.log("触发空格")
          if (mindMap.renderer.activeNodeList.length <= 0) {
            return
          }
          textEdit.show(mindMap.renderer.activeNodeList[0])
        })

        mindMap.on('node_tree_render_end', (...args) => {
          // updateMiniMap();
          if (firstRender) {
            goTargetRoot();
            // debugger
            console.log("定位根节点")
            mindMap.renderer.moveNodeToCenter(mindMap.renderer.root)
          }
          firstRender = false;
        })
        // debugger
        //监控导图数据变更事件
        mindMap.on('data_change', (...args) => {
          throttleSave(args[0]);
        })
        mindMap.on('view_theme_change', (...args) => {
          console.log("样式调整mindMap.renderer.moveNodeToCenter(mindMap.renderer.root)")
          mindMap.renderer.moveNodeToCenter(mindMap.renderer.root)
        })

        let nodeNoteEl = props.contentEl.querySelector('#nodeNote');
        mindMap.on("node_active",(node)=>{
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
            saveNote();
            // 处理输入事件，使用获取到的 value ...
          });

        }

        //监听刷新事件，刷新视图
        props.app.workspace.on(
            EVENT_APP_REFRESH,
            handleRefreshEvent
        );

        props.app.workspace.on('resize', () => {
          // debugger;
          mindResize();
        })

        //嵌入模式动态修改容器尺寸事件
        props.app.workspace.on(EVENT_APP_EMBEDDED_RESIZE, (leaf: WorkspaceLeaf)=>{
          //是当前页面，且是嵌入模式
          if (props.leaf.id === leaf.id && props.mode==='embedded-edit') {
            mindResize();
          }
        })

        props.app.workspace.on("css-change", () => {
          const el = document.querySelector("body");
          //是否深色模式
          if (el?.className.includes("theme-dark") ?? false) {
            mindMap.setTheme('dark')
          } else {
            mindMap.setTheme('default')
          }
        }, props.app)

        props.app.workspace.on("active-leaf-change", (leaf: WorkspaceLeaf) => {
          if (!leaf) return;
          if (props.leaf.id === leaf.id) {
            mindResize();
          }
        })


        // debugger
        //渲染小地图
        if (props.showMiniMap) {
          createApp(Navigator, {
            mindMap: mindMap,
            app: props.app,
            contentEl: props.contentEl
          }).mount(props.contentEl.querySelector("#miniMap"));
        }
        //渲染工具栏
        if (props.showMindTools){
          createApp(MindTools, {
            mindMap: mindMap,
            app: props.app,
            contentEl: props.contentEl
          }).mount(props.contentEl.querySelector("#mindTools"));
        }

      });

    });

    // 在组件销毁时进行清理操作
    onUnmounted(() => {
      // 清理操作，例如取消事件监听等
      console.log("onUnmounted 组件取消挂载：" + mydata.compId)

      offListener()
    });

    return {
      mydata,
      handleRefreshEvent,
      mindMap,
      goTargetRoot,
      remakModelToggle,
    };
  },
  beforeDestroy() {
    console.log("beforeDestroy 组件被销毁：" + mydata.compId)
    offListener()
  }

})
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