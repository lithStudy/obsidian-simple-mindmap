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
    console.log("NodeNoteContentShow created")
    this.contentEl.addEventListener('click', this.hideNoteContent)
    document.body.addEventListener('click', this.hideNoteContent)
  },
  mounted() {
    console.log("NodeNoteContentShow mounted")
    this.app.workspace.on(EVENT_APP_MIND_NODE_REMARK_PREVIEW, this.onShowNoteContent)
    this.initEditor()
  },
  unmounted(){
      console.log("NodeNoteContentShow unmounted")
      this.app.workspace.off(EVENT_APP_MIND_NODE_REMARK_PREVIEW, this.onShowNoteContent)
      document.body.removeEventListener('click', this.hideNoteContent)
      if (this.$refs.noteContentViewer) {
        this.$refs.noteContentViewer.removeEventListener('click')
      }
  },
  beforeDestroy() {
    console.log("NodeNoteContentShow beforeDestroy")
   
  },
  methods: {
    /**
     * @Author: 王林25
     * @Date: 2022-11-14 19:56:08
     * @Desc: 显示备注浮层
     */
    processObsidianLinks(content) {
      // 将 [[链接]] 转换为特殊样式的 HTML
      return content.replace(/\[\[(.*?)\]\]/g, 
      '<a href="#" class="obsidian-link" data-link="$1">[[<span class="link-text">$1</span>]]</a>'
    );
    },

    onShowNoteContent(content, left, top) {
      let rect = this.contentEl.getBoundingClientRect();
      const paddingTop = parseFloat(getComputedStyle(this.contentEl).paddingTop);
      const paddingBottom = parseFloat(getComputedStyle(this.contentEl).paddingBottom);

      this.left = left - rect.x;
      this.top = top - rect.y + paddingTop + paddingBottom;

      // 处理内容中的 Obsidian 链接
      const processedContent = this.processObsidianLinks(content);
      this.editor.setMarkdown(processedContent);
      
      this.show = true;
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
      if (!this.editor && this.$refs.noteContentViewer) {
        this.editor = new Viewer({
          el: this.$refs.noteContentViewer
        });

        // 直接在容器元素上添加点击事件监听
        this.$refs.noteContentViewer.addEventListener('click', (event) => {
          const target = event.target.closest('.obsidian-link');
          if (target) {
            event.preventDefault();
            // 使用 Obsidian API 打开链接
            this.app.workspace.openLinkText(target.dataset.link, '', true, { active: true });
          }
        });
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

  :deep(.obsidian-link) {
    color: var(--text-accent);
    cursor: pointer;
    
    &:hover {
      text-decoration: underline;
    }
    
    .link-text {
      color: var(--text-normal);
    }
  }
}
</style>
