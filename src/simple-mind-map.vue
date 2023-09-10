<template>
    <div>
        <span>{{compId}}</span>
        <!-- <span class="sample-class">{{ count }}</span> -->
		    <!-- <div id="mindMapContainer" ref="mindMapContainerRef"></div> -->
            <div id="mindMapContainer" ref="mindMapContainerRef" :style="{ height: initElementHeight }"></div>
            <div 
                class="container"
                @mousedown="onMousedown"
                    @mousemove="onMousemove"
                    @mouseup="onMouseup"
                >
                    <div 
                    class="miniMapContainer" 
                    ref="miniMapContainer"
                    :style="{
                        transform: `scale(${miniMapBoxScale})`,
                        left: miniMapBoxLeft + 'px',
                        top: miniMapBoxTop + 'px'
                        }"
                >
                    
            </div>
            <div class="viewBoxContainer" :style="viewBoxStyle"></div>
            </div>
    </div>
</template>

<style scoped>
/* @import "./simpleMindMap.esm.css"; */
  
  .mindMapDemo {
    width: 100%;
    position: relative;
  }
.sample-class {
    margin-left: 1em;
    color: #6C31E3;
}

#mindMapContainer {
    width: 100%;
    /* min-height: 400px; */
    /* height: 100%; */
    /* height: 2000px; */
  }

  #mindMapContainer * {
    margin: 0;
    padding: 0;
  }


  .container {
    position: absolute;
    left: 10px;
    top: 10px;
    width: 100px;
    height: 50px;
  }
  
  .miniMapContainer {
    position: absolute;
    transform-origin: left top;
  }
  
  .viewBoxContainer {
    position: absolute;
    border: 2px solid rgb(238, 69, 69);
    transition: all 0.3s;
  }
</style>

<script lang="ts">
import { defineComponent,ref, onMounted, shallowRef,reactive,provide   } from "vue";
import MindMap from "simple-mind-map";
import Drag from "simple-mind-map/src/plugins/Drag.js"
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import MiniMap from 'simple-mind-map/src/plugins/MiniMap.js'
import { App} from "obsidian";
import { EVENT_APP_REFRESH ,MARKMIND_DEFAULT_DATA} from "./constants/constant";
import _ from "lodash";

const THROTTLE_TIME_MILLIS = 3000;
            console.log('修改11111111111')




// // 更新小地图
// const miniMapContainer = ref(null)
// const viewBoxStyle = ref({})
// const miniMapBoxScale = ref(1)
// const miniMapBoxLeft = ref(0)
// const miniMapBoxTop = ref(0)
// const updateMiniMp = () => {
//   // 计算小地图数据
//   let data = mindMap.miniMap.calculationMiniMap(containerWidth, containerHeight)
//   debugger
//   // 渲染到小地图
//   miniMapContainer.value.innerHTML = data.svgHTML
//   viewBoxStyle.value = data.viewBoxStyle
//   miniMapBoxScale.value = data.miniMapBoxScale
//   miniMapBoxLeft.value = data.miniMapBoxLeft
//   miniMapBoxTop.value = data.miniMapBoxTop
// }
// const onMousedown = (e) => {
//   mindMap.miniMap.onMousedown(e)
// }

// const onMousemove = (e) => {
//   mindMap.miniMap.onMousemove(e)
// }

// const onMouseup = (e) => {
//   mindMap.miniMap.onMouseup(e)
// }



export default defineComponent({
    name: "SampleSettingTabPage",
    // props: ['mindFile','initMindData','app','mode','initElementHeight'],
    props:{
        mindFile: {            
            required: false
        },
        initMindData: {            
            required: false
        },
        app: {            
            required: false
        },
        mode: {            
            required: false
        },
        initElementHeight: {            
            required: false
        },
    },
    // data() :{
    //         markMind:MindMap;
    //         mindMapData:{}
    //         compId:number;
    //         mindMode:'preview'|'edit'
    // }{
    //     return {
    //         markMind:null,
    //         mindMapData:{data:{},children:[]},
    //         compId:null,
    //         mindMode:'edit',
    //         mindTheme:'dark',
    //         // elementHeight:'400px',
    //     }
    // },
    methods: {
        
    },
    setup(props) {
        // const message = ref(props.initMindData)
        console.log('ddddd:'+props.initMindData)

        // const app = this.app;
        let mindMap = null

        const mydata = reactive({
            markMind:null,
            mindMapData:{data:{},children:[]},
            compId:null,
            mindMode:'edit',
            mindTheme:'dark',
        })

        // 小地图容器的宽高
        const containerWidth = 100
        const containerHeight = 50
        const mindMapContainerRef = ref(null);
        const miniMapContainer = ref(null);
        const viewBoxStyle = ref({});
        const miniMapBoxScale = ref(1);
        const miniMapBoxLeft = ref(0);
        const miniMapBoxTop = ref(0);

        const updateMiniMap = () => {
            // 计算小地图数据
            let data = mindMap.miniMap.calculationMiniMap(containerWidth, containerHeight);

            // 渲染到小地图
            miniMapContainer.value.innerHTML = data.svgHTML;
            viewBoxStyle.value = data.viewBoxStyle;
            miniMapBoxScale.value = data.miniMapBoxScale;
            miniMapBoxLeft.value = data.miniMapBoxLeft;
            miniMapBoxTop.value = data.miniMapBoxTop;
        };

        const onMousedown = (e) => {
        mindMap.miniMap.onMousedown(e);
        };

        const onMousemove = (e) => {
        mindMap.miniMap.onMousemove(e);
        };

        const onMouseup = (e) => {
        mindMap.miniMap.onMouseup(e);
        };

        

        const handleRefreshEvent = (newCompId,newMindData) =>{
			if(mydata.compId!==newCompId){
                // debugger
                console.log('监听到其他视图的刷新事件：当前视图id：'+mydata.compId+",其他视图："+newCompId)
                if(JSON.stringify(mydata.markMind.getData(false))===JSON.stringify(newMindData)){
                    console.log("数据相等，不重新渲染")
                }else{
                    //这里不能直接用setData方法，会导致循环依赖保存
                    // this.markMind.setData(mindData)  
                    console.log("触发刷新，当前视图id："+this.compId)      
                    mydata.markMind.execCommand('CLEAR_ACTIVE_NODE')
                    mydata.markMind.command.clearHistory()
                    mydata.markMind.renderer.renderTree = newMindData;
                    mydata.markMind.reRender(() => {}, 'setData') 

                    // this.markMind.setData(newMindData)
                }
            }
		};

        // 在组件挂载时调用 updateMiniMap 函数
        onMounted(() => {

            mydata.compId = Math.random();   

            mydata.mindMapData = { ...mydata.mindMapData, ...props.initMindData };
            // this.elementHeight=this.initElementHeight?this.initElementHeight:'400px'
            // debugger;

            mydata.mindMode = props.mode||'edit'

            const bodyEl = document.querySelector("body");
            //是否深色模式
            if(bodyEl?.className.includes("theme-dark") ?? false){
                mydata.mindTheme = 'dark'
            }else{
                mydata.mindTheme='default'
            }

            // const el_temp = this.$refs.mindMapContainerRef
            const el_temp = mindMapContainerRef.value
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
            mydata.markMind = new MindMap({
                el: el_temp,
                //主题：logicalStructure（逻辑结构图）、mindMap（思维导图）、organizationStructure（组织结构图）、catalogOrganization（目录组织图）、timeline（时间轴）、timeline2（时间轴2）、fishbone（鱼骨图）、verticalTimeline（v0.6.6+竖向时间轴）
                layout: 'mindMap',
                theme: mydata.mindTheme,
                //允许拖拽
                enableFreeDrag: true,
                readonly:mydata.mindMode==='preview'?true:false,
                // initRootNodePosition: ['center', 'center'],
                mousewheelAction: 'move',// zoom（放大缩小）、move（上下移动）
                data: mydata.mindMapData
            });	
            mindMap = mydata.markMind;	

            //节流保存数据
            const throttleSave = _.throttle((mindDataTempParam:{})=>{
                console.log('修改222222222222')
                props.app.vault.modify(props.mindFile, JSON.stringify(mindDataTempParam));
                //触发刷新事件用于通知其他视图刷新
                props.app.workspace.trigger(EVENT_APP_REFRESH,mydata.compId,mindDataTempParam);
            }, THROTTLE_TIME_MILLIS);

            mydata.markMind.on('node_tree_render_end',(...args)=>{
                // console.log("节点渲染完毕:"+mydata.markMind)
                // this.app.workspace.containerEl.find('#mindMapContainer').style.height='1000px'
                // this.markMind.resize();
                // debugger
            })
            // debugger
            //监控导图数据变更事件
            mydata.markMind.on('data_change', (...args) => {
                // debugger
                updateMiniMap()
                throttleSave(args[0]);
                // this.app.vault.modify(this.mindFile, JSON.stringify(args[0]));
                // //触发刷新事件用于通知其他视图刷新
                // this.app.workspace.trigger(EVENT_APP_REFRESH,this.compId,args[0]);
            })

            //监听刷新事件，刷新视图
            props.app.workspace.on(
                EVENT_APP_REFRESH,
                handleRefreshEvent
            );

            props.app.workspace.on('resize', () => {
                // this.app.workspace.containerEl.find('#mindMapContainer').style.height='1000px'
                // debugger;
                console.log('resize')
                //重置思维导图尺寸
                mydata.markMind.resize();
            })

            props.app.workspace.on("css-change", () => {            
                const el = document.querySelector("body");
                //是否深色模式
                if(el?.className.includes("theme-dark") ?? false){
                    mydata.markMind.setTheme('dark')
                }else{
                    mydata.markMind.setTheme('default')
                }
            },props.app)

            updateMiniMap();
        });

        // // 在组件销毁时进行清理操作
        // onUnmounted(() => {
        // // 清理操作，例如取消事件监听等
        // });

        provide('mindMap', mindMap); // 使用 provide 函数将 message 变量提供给父组件
        return {
            miniMapContainer,
            viewBoxStyle,
            miniMapBoxScale,
            miniMapBoxLeft,
            miniMapBoxTop,
            updateMiniMap,
            onMousedown,
            onMousemove,
            onMouseup,
            mydata,
            handleRefreshEvent,
            mindMapContainerRef
        };
    },
	mounted() {
        // this.compId = Math.random();   

        // this.mindMapData = { ...this.mindMapData, ...this.initMindData };
        // // this.elementHeight=this.initElementHeight?this.initElementHeight:'400px'
        // // debugger;

        // this.mindMode = this.mode||'edit'
        
        // const bodyEl = document.querySelector("body");
        // //是否深色模式
        // if(bodyEl?.className.includes("theme-dark") ?? false){
        //     this.mindTheme = 'dark'
        // }else{
        //     this.mindTheme='default'
        // }

        // const el_temp = this.$refs.mindMapContainerRef
        // //设置样式
        // // el_temp.style.width ='6000px'
        // // el_temp.style.height ='6000px'
        // //注册拖拽节点
        // MindMap.usePlugin(Drag)
        // //注册键盘导航
        // MindMap.usePlugin(KeyboardNavigation)
        // //注册小地图
        // MindMap.usePlugin(MiniMap)
        // // MindMap.usePlugin(RichText)
        // // debugger;
        // this.markMind = new MindMap({
        //     el: el_temp,
        //     //主题：logicalStructure（逻辑结构图）、mindMap（思维导图）、organizationStructure（组织结构图）、catalogOrganization（目录组织图）、timeline（时间轴）、timeline2（时间轴2）、fishbone（鱼骨图）、verticalTimeline（v0.6.6+竖向时间轴）
        //     layout: 'mindMap',
        //     theme: this.mindTheme,
        //     //允许拖拽
        //     enableFreeDrag: true,
        //     readonly:this.mindMode==='preview'?true:false,
        //     // initRootNodePosition: ['center', 'center'],
        //     mousewheelAction: 'move',// zoom（放大缩小）、move（上下移动）
        //     data: this.mindMapData
        // });	
        // mindMap = this.markMind;	

        // //节流保存数据
        // const throttleSave = _.throttle((mindDataTempParam:{})=>{
        //     console.log('修改222222222222')
        //     this.app.vault.modify(this.mindFile, JSON.stringify(mindDataTempParam));
        //     //触发刷新事件用于通知其他视图刷新
        //     this.app.workspace.trigger(EVENT_APP_REFRESH,this.compId,mindDataTempParam);
        // }, THROTTLE_TIME_MILLIS);

        // this.markMind.on('node_tree_render_end',(...args)=>{
        //     console.log("节点渲染完毕:"+this.markMind)
        //     // this.app.workspace.containerEl.find('#mindMapContainer').style.height='1000px'
        //     // this.markMind.resize();
        //     // debugger
        // })
        // // debugger
        // //监控导图数据变更事件
        // this.markMind.on('data_change', (...args) => {
        //     // debugger
        //     updateMiniMap()
        //     throttleSave(args[0]);
        //     // this.app.vault.modify(this.mindFile, JSON.stringify(args[0]));
        //     // //触发刷新事件用于通知其他视图刷新
        //     // this.app.workspace.trigger(EVENT_APP_REFRESH,this.compId,args[0]);
        // })

        // //监听刷新事件，刷新视图
        // this.app.workspace.on(
		// 	EVENT_APP_REFRESH,
		// 	this.handleRefreshEvent
		// );

        // this.app.workspace.on('resize', () => {
        //     // this.app.workspace.containerEl.find('#mindMapContainer').style.height='1000px'
        //     // debugger;
        //     console.log('resize')
        //     //重置思维导图尺寸
        //     this.markMind.resize();
        // })

        // this.app.workspace.on("css-change", () => {            
        //     const el = document.querySelector("body");
        //     //是否深色模式
        //     if(el?.className.includes("theme-dark") ?? false){
        //         this.markMind.setTheme('dark')
        //     }else{
        //         this.markMind.setTheme('default')
        //     }
		// },this.app)
        
        
    },
    beforeDestroy(){
        console.log("组件被销毁："+this.compId)
        //卸载监听事件，也不知道有没有好处，照猫画虎，即使有这个卸载，监听事件还是会被触发多次，后面排查
        // this.app.workspace.off(EVENT_APP_REFRESH);
    }

})
</script>