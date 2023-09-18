<template>
  <div
    class="mindToolsBox"
    :class="{ isDark: isDark }"
    :style="{ top: top + 'px', right: right + 'px'}"
    ref="mindToolsBox"
  >
    <div @click="resize()" class="toolsButton">重置</div>
    <div @click="remark()" class="toolsButton">备注</div>
  </div>
</template>

<script>
import { inject } from 'vue'

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
      clickCount: 0,         // 点击次数计数器
      clickTimestamps: []   // 点击时间戳数组
    }
  },
  computed: {
    // ...mapState(['isDark']),
  },
  mounted() {
    this.updateTheme()
    this.setPosition();
    this.app.workspace.on("css-change", () => {
      this.updateTheme()
    },this.app)

  },
  destroyed() {
    this.app.workspace.off("css-change");
  },
  methods: {
    resize(){
      // console.log("定位根节点")
      this.mindMap.resize();
      this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
    },
    remark(){
      if (this.mindMap.renderer.activeNodeList.length <= 0) {
        return
      }
      this.mindMap.renderer.activeNodeList[0].setNote('备注内容')
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
        // const parentElement = this.contentEl.querySelector('[data-type="mufeng-markmind"].workspace-leaf-content')
        const parentElement = this.contentEl.parentElement
        const childElement = this.contentEl.querySelector('#mindMapContainer');

        // 获取子元素相对于父容器的位置信息
        const parentRect = parentElement.getBoundingClientRect();
        const childRect = childElement.getBoundingClientRect();

        const relativeRight = parentRect.right - childRect.right;
        const relativeTop = childRect.top - parentRect.top;

        this.right=relativeRight
        this.top=relativeTop
    },

  }
}
</script>

<style  lang="less" scoped>
.mindToolsBox {
  position: absolute;
  //width: 150px;
  //height: 100px;
  background-color: #fff;
  // bottom: 80px;
  // right: 70px;
  top: 10px;
  right: 20px;
  //box-shadow: 0 0 16px #989898;

  cursor: pointer;
  user-select: none;

  &.isDark {
    background-color: #262a2e;
  }
  .toolsButton{
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
</style>
