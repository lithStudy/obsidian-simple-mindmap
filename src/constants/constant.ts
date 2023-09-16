export const DEFAULT_LOOM_NAME = "Untitled";

export const FILE_EXTENSION = "mind";

/**
 * Matches an extension with a leading period.
 * @example
 * .loom
 */
export const EXTENSION_REGEX = new RegExp(/\.[a-z]*$/);

/**
 * Matches all wiki links
 * @example
 * [[my-file]]
 * @example
 * [[my-file|alias]]
 * @example
 * [[my-file|]]
 */
export const WIKI_LINK_REGEX = new RegExp(/\[\[([^|\]]+)(?:\|([\w-]+))?\]\]/g);

export const EVENT_APP_REFRESH = "mufeng-mind-refresh"
export const EVENT_APP_EMBEDDED_RESIZE="mufeng-mind-embedded-resize"

export const MARKMIND_DEFAULT_DATA = {"data": {"text": "根节点"}, "children": []}
