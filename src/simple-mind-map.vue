<template>
    <div>
        <span>{{compId}}</span>
        <!-- <span class="sample-class">{{ count }}</span> -->
		    <div id="mindMapContainer" ref="mindMapContainerRef" ></div>
    </div>
</template>

<style scoped>
.sample-class {
    margin-left: 1em;
    color: #6C31E3;
}

#mindMapContainer {
    width: 1000px;
    height: 1000px;
  }

  #mindMapContainer * {
    margin: 0;
    padding: 0;
  }
</style>

<script lang="ts">
import { defineComponent,ref, onMounted  } from "vue";
import MindMap from "simple-mind-map";
import Drag from "simple-mind-map/src/plugins/Drag.js"
import KeyboardNavigation from 'simple-mind-map/src/plugins/KeyboardNavigation.js'
import { App} from "obsidian";
import { EVENT_APP_REFRESH ,MARKMIND_DEFAULT_DATA} from "./constants/constant";
import _ from "lodash";

const THROTTLE_TIME_MILLIS = 3000;
            console.log('修改11111111111')



export default defineComponent({
    name: "SampleSettingTabPage",
    props: ['mindFile','initMindData','app','mode'],
    data() :{
            markMind:MindMap;
            mindMapData:{}
            compId:number;
            mindMode:'preview'|'edit'
    }{
        return {
            markMind:null,
            mindMapData:{data:{},children:[]}
            compId:null,
            mindMode:'edit',
        }
    },
    methods: {
        handleRefreshEvent(newCompId,newMindData) {
			if(this.compId!==newCompId){
                // debugger
                console.log('监听到其他视图的刷新事件：当前视图id：'+this.compId+",其他视图："+newCompId)
                if(JSON.stringify(this.markMind.getData(false))===JSON.stringify(newMindData)){
                    console.log("数据相等，不重新渲染")
                }else{
                    //这里不能直接用setData方法，会导致循环依赖保存
                    // this.markMind.setData(mindData)  
                    console.log("触发刷新，当前视图id："+this.compId)      
                    this.markMind.execCommand('CLEAR_ACTIVE_NODE')
                    this.markMind.command.clearHistory()
                    this.markMind.renderer.renderTree = newMindData;
                    this.markMind.reRender(() => {}, 'setData') 

                    // this.markMind.setData(newMindData)
                }
            }
		},
        mindmodify(mindDataTemp:{}){
            

            test(mindDataTemp);
        }
    },
	mounted() {
        this.compId = Math.random();   

        this.mindMapData = { ...this.mindMapData, ...this.initMindData };

        this.mindMode = this.mode||'edit'

        const el_temp = this.$refs.mindMapContainerRef
        //设置样式
        // el_temp.style.width ='6000px'
        // el_temp.style.height ='6000px'
        //注册拖拽节点
        MindMap.usePlugin(Drag)
        //注册键盘导航
        MindMap.usePlugin(KeyboardNavigation)
        // MindMap.usePlugin(RichText)
        // debugger;
        this.markMind = new MindMap({
            el: el_temp,
            //主题：logicalStructure（逻辑结构图）、mindMap（思维导图）、organizationStructure（组织结构图）、catalogOrganization（目录组织图）、timeline（时间轴）、timeline2（时间轴2）、fishbone（鱼骨图）、verticalTimeline（v0.6.6+竖向时间轴）
            layout: 'mindMap',
            theme: 'dark',
            //允许拖拽
            enableFreeDrag: true,
            readonly:this.mindMode==='preview'?true:false,
            // initRootNodePosition: ['center', 'center'],
            data: this.mindMapData
        });		

        const test = _.throttle((mindDataTempParam:{})=>{
            console.log('修改222222222222')
            this.app.vault.modify(this.mindFile, JSON.stringify(mindDataTempParam));
            //触发刷新事件用于通知其他视图刷新
            this.app.workspace.trigger(EVENT_APP_REFRESH,this.compId,mindDataTempParam);
        }, THROTTLE_TIME_MILLIS);

        // debugger
        //监控导图数据变更事件
        this.markMind.on('data_change', (...args) => {
            test(args[0]);
            // this.app.vault.modify(this.mindFile, JSON.stringify(args[0]));
            // //触发刷新事件用于通知其他视图刷新
            // this.app.workspace.trigger(EVENT_APP_REFRESH,this.compId,args[0]);
        })

        //监听刷新事件，刷新视图
        this.app.workspace.on(
			EVENT_APP_REFRESH,
			this.handleRefreshEvent
		);

        // this.app.workspace.on('resize', () => {
        //     // console.log('resize')
        //     //重置思维导图尺寸
        //     // this.markMind.resize();
        // })

        
        
    },
    beforeDestroy(){
        console.log("组件被销毁："+this.compId)
        //卸载监听事件，也不知道有没有好处，照猫画虎，即使有这个卸载，监听事件还是会被触发多次，后面排查
        this.app.workspace.off(EVENT_APP_REFRESH);
    }

})
</script>