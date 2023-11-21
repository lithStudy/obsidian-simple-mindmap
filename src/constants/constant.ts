/**
 * 默认的导图文件名
 */
export const DEFAULT_FILE_NAME = "Untitled";

/**
 * 默认的导图文件后缀
 */
export const FILE_EXTENSION = "mind";



/**
 * obsidian自带的事件
 */
export const EVENT_APP_RESIZE='resize'
export const EVENT_APP_CSS_CHANGE='css-change'
export const EVENT_APP_QUICK_PREVIEW='quick-preview'
export const EVENT_APP_LEAF_CHANGE_ACTIVE='active-leaf-change'
/**
 * 自定义的obsidian事件
 */
export const EVENT_APP_MIND_EXPORT='mind-export'
export const EVENT_APP_MIND_REFRESH = 'mind-refresh'
export const EVENT_APP_MIND_EMBEDDED_RESIZE='mind-embedded-resize'
export const EVENT_APP_MIND_NODE_REMARK_PREVIEW='mind-note-preview'
export const EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE='mind-note-input-active'
export const EVENT_APP_MIND_NODE_PRIORITY='mind-node-priority'
/**
 * mindmap自带的事件
 */
export const EVENT_MIND_NODE_ACTIVE='node_active'
export const EVENT_MIND_THEME_CHANGE='view_theme_change'
export const EVENT_MIND_DATA_CHANGE='data_change'
export const EVENT_MIND_VIEW_DATA_CHANGE='view_data_change'
export const EVENT_MIND_NODE_RENDER_END='node_tree_render_end'



/**
 * 匹配扩展名
 * @example
 * .mind
 */
export const EXTENSION_REGEX = new RegExp(/\.[a-z]*$/);

/**
 * 匹配链接
 * @example
 * [[my-file]]
 * @example
 * [[my-file|alias]]
 * @example
 * [[my-file|]]
 */
export const WIKI_LINK_REGEX = new RegExp(/\[\[([^|\]]+)(?:\|([\w-]+))?\]\]/g);


export const SAVE_THROTTLE_TIME_MILLIS = 3000;
export const MINIMAP_DEBOUNCE_TIME_MILLIS = 500;