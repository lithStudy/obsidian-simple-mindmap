<template>
  <div>
    <textarea class="remarkBox" :style="{ height: remarkBoxHeight }">
  在w3school，你可以找到你所需要的所有的网站建设教程。
  </textarea>
    <div @click="resize()" class="toolsButton">保存</div>
    <div @click="remark()" class="toolsButton">取消</div>
  </div>
</template>

<script>
import {inject} from 'vue'

export default {
  props: {
    mindMap: {
      type: Object
    },
    app: {
      required: false
    },
    contentEl: {
      required: false
    }
  },
  data() {
    return {
      remarkBoxHeight
    }
  },
  mounted() {
    this.mindMap.on('node_active', this.data_change)

  },
  destroyed() {
    this.mindMap.on('node_active', this.data_change)
  },
  methods: {
    data_change() {
      if (!this.showMiniMap) {
        return
      }
      this.drawMiniMap()
      // clearTimeout(this.timer)
      // this.timer = setTimeout(() => {
      //   // this.setPosition();
      //   this.drawMiniMap()
      // }, 500)
    },
    init() {
      let {width, height} = this.$refs.navigatorBox.getBoundingClientRect()
      this.boxWidth = width
      this.boxHeight = height
      this.updateTheme()
    },

    drawMiniMap() {
      let {
        svgHTML,
        viewBoxStyle,
        miniMapBoxScale,
        miniMapBoxLeft,
        miniMapBoxTop
      } = this.mindMap.miniMap.calculationMiniMap(this.boxWidth, this.boxHeight)

      // 渲染到小地图
      this.$refs.svgBox.innerHTML = svgHTML
      this.viewBoxStyle = viewBoxStyle
      this.svgBoxScale = miniMapBoxScale
      this.svgBoxLeft = miniMapBoxLeft
      this.svgBoxTop = miniMapBoxTop
    },

    onMousedown(e) {

      //快速点击三次，将root定位到画布中央
      this.handleMouseDown();
      this.mindMap.miniMap.onMousedown(e)

    },

    onMousemove(e) {
      this.mindMap.miniMap.onMousemove(e)
    },

    onMouseup(e) {
      this.mindMap.miniMap.onMouseup(e)
    },
    updateTheme() {
      const el = document.querySelector("body");
      //是否深色模式
      if (el?.className.includes("theme-dark") ?? false) {
        this.isDark = true;
      } else {
        this.isDark = false;
      }
    },
    setPosition() {
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
    handleMouseDown() {
      // debugger;
      const currentTime = new Date().getTime();  // 获取当前时间戳

      // 添加当前点击时间戳到数组中
      this.clickTimestamps.push(currentTime);

      // 如果点击时间戳数组长度超过3个
      if (this.clickTimestamps.length > 3) {
        this.clickTimestamps.shift();  // 移除最早的时间戳
      }

      // 检查点击时间间隔是否在一秒内
      const interval = currentTime - this.clickTimestamps[0];
      if (interval <= 1000 && this.clickTimestamps.length === 3) {
        this.handleClickEvent();  // 触发特定事件
      }
    },
    handleClickEvent() {
      // console.log('连续三次点击！');
      // 在这里执行你想触发的特定事件逻辑
      this.mindMap.renderer.moveNodeToCenter(this.mindMap.renderer.root)
      // this.mindMap.view.fit()
    }

  }
}
</script>



<style lang="less" scoped>
.remarkBox{
  width: 100%;
  min-height: 400px;
}
</style>