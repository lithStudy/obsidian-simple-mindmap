<template>
  <div class="node-note-modal" v-if="dialogVisible">
    <div class="modal-container">
      <div class="modal-header">
        <h3>备注</h3>
        <div class="modal-close-button" @click="cancel">×</div>
      </div>
      <div class="obsidian-editor" ref="editorContainer"></div>
      <div class="modal-footer">
        <button class="mod-cta" @click="confirm">确认</button>
        <button @click="cancel">取消</button>
      </div>
    </div>
  </div>
</template>

<script>
import { TextAreaComponent ,Editor,MarkdownView} from 'obsidian'

export default {
  name: 'NodeNote',
  props: {
    mindMap: {
      type: Object
    },
    app: {            
      required: false
    },    
  },  
  data() {
    return {
      dialogVisible: true,
      note: '',
      activeNodes: [],
      editor: null
    }
  },
  mounted() {
    this.initEditor()
  },
  beforeDestroy() {
    if (this.editor) {
      this.editor.destroy();
      this.editor = null;
    }
  },
  methods: {
    handleNodeActive(...args) {
      this.activeNodes = [...args[1]]
      if (this.activeNodes.length > 0) {
        let firstNode = this.activeNodes[0]
        this.note = firstNode.getData('note')
        if (this.editor) {
          this.editor.getDoc().setValue(this.note || '');
        }
      } else {
        this.note = ''
        if (this.editor) {
          this.editor.getDoc().setValue('');
          this.editor.getDoc().setValue('');
        }
      }
    },

    handleShowNodeNote() {
      this.$bus.$emit('startTextEdit')
      this.dialogVisible = true
      this.$nextTick(() => {
        if (!this.editor) {
          this.initEditor()
        }
      })
    },

    initEditor() {
      debugger
      if (!this.editor && this.$refs.editorContainer) {
      // 获取当前活动的 MarkdownView
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      
      // 创建一个新的编辑器实例
      this.editor = new Editor(this.$refs.editorContainer);
      
      this.note="ddd"
      // 设置初始内容
      if (this.note) {
        this.editor.getDoc().setValue(this.note);
      }

      // 确保编辑器可编辑
      this.editor.getDoc().cm.setOption('readOnly', false);
      
      // 聚焦编辑器
      this.$nextTick(() => {
        this.editor.focus();
      });
    }
    },

    cancel() {
      this.dialogVisible = false
      this.$bus.$emit('endTextEdit')
    },

    confirm() {
      if (this.editor) {
        this.note = this.editor.getDoc().getValue();
        this.activeNodes.forEach(node => {
          node.setNote(this.note)
        })
      }
      this.cancel()
    },

    setEditorContent(content) {
      try {
        if (this.editor) {
          this.editor.replaceSelection(content || '')
        }
      } catch (error) {
        console.error('设置编辑器内容失败:', error)
        if (this.editor) {
          this.editor.getDoc().setValue(content || '')
        }
      }
    },

    getEditorContent() {
      try {
        return this.editor ? this.editor.getValue() : ''
      } catch (error) {
        console.error('获取编辑器内容失败:', error)
        return this.note || ''
      }
    }
  }
}
</script>

<style lang="less" scoped>
.node-note-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;

  .modal-container {
    background-color: var(--background-primary);
    border-radius: 6px;
    width: 500px;
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }

  .modal-header {
    padding: 15px;
    border-bottom: 1px solid var(--background-modifier-border);
    display: flex;
    justify-content: space-between;
    align-items: center;

    h3 {
      margin: 0;
      font-size: 16px;
      color: var(--text-normal);
    }

    .modal-close-button {
      cursor: pointer;
      font-size: 20px;
      color: var(--text-muted);
      &:hover {
        color: var(--text-normal);
      }
    }
  }

  .obsidian-editor {
    height: 300px;
    padding: 15px;
    border: 1px solid var(--background-modifier-border);
    margin: 15px;
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
  }

  .obsidian-editor .cm-editor {
    height: 100%;
  }

  .obsidian-editor .cm-scroller {
    height: 100% !important;
  }

  .obsidian-editor .cm-content {
    height: 100%;
    padding: 4px 0;
  }

  .modal-footer {
    padding: 15px;
    text-align: right;
    border-top: 1px solid var(--background-modifier-border);

    button {
      margin-left: 10px;
    }
  }
}
</style>
