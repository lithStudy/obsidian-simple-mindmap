<template>
  <div
      id="navigatorId"
      class="navigatorBox"
      :class="{ isDark: isDark }"
      :style="{ top: top + 'px', left: left + 'px'}"
      ref="navigatorBox"
      @mousedown="onMousedown"
      @mousemove="onMousemove"
      @mouseup="onMouseup"
  >
    <div
        class="svgBox"
        ref="svgBox"
        :style="{
        transform: `scale(${svgBoxScale})`,
        left: svgBoxLeft + 'px',
        top: svgBoxTop + 'px'
      }"
    ></div>
    <div class="windowBox" :style="viewBoxStyle"></div>
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
    },
    compId:0,
  },
  data() {
    return {
      isDark: true,
      showMiniMap: true,
      timer: null,
      boxWidth: 0,
      boxHeight: 0,
      svgBoxScale: 1,
      svgBoxLeft: 0,
      svgBoxTop: 0,
      viewBoxStyle: {
        left: 0,
        top: 0,
        bottom: 0,
        right: 0
      },
      navigatorBoxStyle: {
        left: 0,
        top: 0
      },

      top: 0,
      left: 0,
      clickCount: 0,         // 点击次数计数器
      clickTimestamps: []   // 点击时间戳数组
    }
  },
  computed: {
    // ...mapState(['isDark']),
  },
  mounted() {
    this.init()
    this.setPosition();

    this.mindMap.on('data_change', this.data_change)
    this.mindMap.on('view_data_change', this.data_change)
    this.mindMap.on('node_tree_render_end', this.data_change)

    this.app.workspace.on("css-change", () => {
      this.updateTheme()
    }, this.app)

  },
  destroyed() {
    console.log("Navigator destroyed")
    this.mindMap.off('data_change', this.data_change)
    this.mindMap.off('view_data_change', this.data_change)
    this.mindMap.off('node_tree_render_end', this.data_change)
    this.app.workspace.off("css-change");
  },
  methods: {
    toggle_mini_map(show) {
      this.showMiniMap = show
      this.$nextTick(() => {
        if (this.$refs.navigatorBox) {
          this.init()
        }
        if (this.$refs.svgBox) {
          this.drawMiniMap()
        }
      })
    },
    data_change() {
      console.log('navigator compId:'+this.compId);
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

      // this.init();
      // this.setPosition();
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
.navigatorBox {
  position: absolute;
  width: 150px;
  height: 100px;
  background-color: #fff;
  // bottom: 80px;
  // right: 70px;
  top: 10px;
  left: 20px;
  box-shadow: 0 0 16px #989898;
  border-radius: 4px;
  border: 1px solid #eee;
  cursor: pointer;
  user-select: none;

  &.isDark {
    background-color: #262a2e;
  }

  .svgBox {
    position: absolute;
    left: 0;
    transform-origin: left top;
  }

  .windowBox {
    position: absolute;
    border: 2px solid rgb(238, 69, 69);
    transition: all 0.3s;
  }
}
</style>
