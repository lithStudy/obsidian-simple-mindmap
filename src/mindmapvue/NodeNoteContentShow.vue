<template>
  <div
    class="noteContentViewer"
    ref="noteContentViewer"
    :style="{
      left: this.left + 'px',
      top: this.top + 'px',
      visibility: show ? 'visible' : 'hidden'
    }"
    @click.stop
  ></div>
</template>

<script>
import Viewer from '@toast-ui/editor/dist/toastui-editor-viewer'
import '@toast-ui/editor/dist/toastui-editor-viewer.css'
import {EVENT_APP_MIND_NODE_REMARK_PREVIEW} from "../constants/constant";

/**
 * @Author: 王林
 * @Date: 2021-06-24 22:53:54
 * @Desc: 节点备注内容显示
 */
export default {
  name: 'NodeNoteContentShow',
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
      editor: null,
      show: false,
      left: 0,
      top: 0,
    }
  },
  created() {
    this.app.workspace.on(EVENT_APP_MIND_NODE_REMARK_PREVIEW, this.onShowNoteContent)
    this.contentEl.addEventListener('click', this.hideNoteContent)
    document.body.addEventListener('click', this.hideNoteContent)
  },
  mounted() {
    this.initEditor()
  },
  beforeDestroy() {
    this.app.workspace.off(EVENT_APP_MIND_NODE_REMARK_PREVIEW, this.onShowNoteContent)
    document.body.removeEventListener('click', this.hideNoteContent)
  },
  methods: {
    /**
     * @Author: 王林25
     * @Date: 2022-11-14 19:56:08
     * @Desc: 显示备注浮层
     */
    onShowNoteContent(content, left, top) {
      //计算偏移
      // let rect = this.app.workspace.activeLeaf.containerEl.getBoundingClientRect();
      let rect = this.contentEl.getBoundingClientRect();
      // debugger
      const paddingTop = parseFloat(getComputedStyle(this.contentEl).paddingTop);
      const paddingBottom = parseFloat(getComputedStyle(this.contentEl).paddingBottom);

      this.left = left -rect.x
      this.top = top-rect.y+paddingTop+paddingBottom

      this.editor.setMarkdown(content)
      this.show = true
    },

    /**
     * @Author: 王林25
     * @Date: 2022-11-14 19:56:20
     * @Desc: 隐藏备注浮层
     */
    hideNoteContent() {
      this.show = false
    },

    /**
     * @Author: 王林25
     * @Date: 2022-05-09 11:37:05
     * @Desc: 初始化编辑器
     */
    initEditor() {
      if (!this.editor) {
        this.editor = new Viewer({
          el: this.$refs.noteContentViewer
        })
      }
    }
  }
}
</script>

<style lang="less" scoped>
.noteContentViewer {
  //display:block;
  background-color: #fff;
  padding: 10px;
  border-radius: 5px;
  max-height: 300px;
  position: fixed;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 7px;
    height: 7px;
  }

  &::-webkit-scrollbar-thumb {
    border-radius: 7px;
    background-color: rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }

  &::-webkit-scrollbar-track {
    box-shadow: none;
    background: transparent;
    display: none;
  }
}
</style>
