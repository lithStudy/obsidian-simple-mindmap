<template>
  <el-dialog
      class="nodeNoteDialog"
      :title="111"
      :visible.sync="dialogVisible"
      width="500"
  >
    <!-- <textarea
      type="textarea"
      style="height: 200px;width: 200px;"
      :autosize="{ minRows: 3, maxRows: 5 }"
      placeholder="请输入内容"
      v-model="note"
    >
    </textarea> -->

    <el-input
      type="textarea"
      :autosize="{ minRows: 3, maxRows: 5 }"
      placeholder="请输入内容"
      v-model="note"
    >
    </el-input>
    
    <!-- <div class="noteEditor" ref="noteEditor" @keyup.stop @keydown.stop></div> -->

    <!-- <div class="tip">换行请使用：Enter+Shift</div> -->
    
    <span slot="footer" class="dialog-footer">
      <el-button @click="cancel">取消</el-button>
      <el-button type="primary" @click="confirm">确认</el-button>
    </span>
  </el-dialog>
</template>

<script>
import Editor from '@toast-ui/editor'
import '@toast-ui/editor/dist/toastui-editor.css' // Editor's Style

/**
 * @Author: 王林
 * @Date: 2021-06-24 22:53:54
 * @Desc: 节点备注内容设置
 */
export default {
  name: 'NodeNote',
  data() {
    return {
      dialogVisible: true,
      note: '',
      activeNodes: [],
      editor: null
    }
  },
  created() {
  },
  beforeDestroy() {
  },
  methods: {
    handleNodeActive(...args) {
      this.activeNodes = [...args[1]]
      if (this.activeNodes.length > 0) {
        let firstNode = this.activeNodes[0]
        this.note = firstNode.getData('note')
      } else {
        this.note = ''
      }
    },

    handleShowNodeNote() {
      this.$bus.$emit('startTextEdit')
      this.dialogVisible = true
      this.$nextTick(() => {
        this.initEditor()
      })
    },

    /**
     * @Author: 王林25
     * @Date: 2022-05-09 11:37:05
     * @Desc: 初始化编辑器
     */
    initEditor() {
      if (!this.editor) {
        this.editor = new Editor({
          el: this.$refs.noteEditor,
          height: '500px',
          initialEditType: 'markdown',
          previewStyle: 'vertical'
        })
      }
      this.editor.setMarkdown(this.note)
    },

    /**
     * @Author: 王林
     * @Date: 2021-06-22 22:08:11
     * @Desc: 取消
     */
    cancel() {
      this.dialogVisible = false
      this.$bus.$emit('endTextEdit')
    },

    /**
     * @Author: 王林
     * @Date: 2021-06-06 22:28:20
     * @Desc:  确定
     */
    confirm() {
      this.note = this.editor.getMarkdown()
      this.activeNodes.forEach(node => {
        node.setNote(this.note)
      })
      this.cancel()
    }
  }
}
</script>

<style lang="less" scoped>
.nodeNoteDialog {
  position: fixed;
  width: 100%;
  height: 100%;
  left: 0px;
  top: 0px;
  background: red;
  .tip {
    margin-top: 5px;
    color: #dcdfe6;
  }
}
</style>
