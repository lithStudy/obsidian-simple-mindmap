import {PluginValue, ViewPlugin, ViewUpdate} from "@codemirror/view";

import {loadEmbeddedMindApps} from "./embedded/embedded-app-manager";
import {App} from "obsidian";
import {
    EVENT_APP_CSS_CHANGE,
    EVENT_APP_MIND_EMBEDDED_RESIZE,
    EVENT_APP_LEAF_CHANGE_ACTIVE, EVENT_APP_MIND_EXPORT,
    EVENT_MIND_NODE_ACTIVE,
    EVENT_APP_MIND_NODE_REMARK_PREVIEW, EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE, EVENT_APP_MIND_NODE_PRIORITY,
    EVENT_APP_QUICK_PREVIEW,
    EVENT_APP_MIND_REFRESH,
    EVENT_APP_RESIZE,
    MARKMIND_DEFAULT_DATA
} from "./constants/constant";

export default function PreviewPlugin(
    app: App,
    manifestPluginVersion: string
) {
    return ViewPlugin.fromClass(
        /**
         * This plugin is responsible for rendering the mind in live preview mode.
         * It is instantiated for each open leaf
         */
        class EditingViewPlugin implements PluginValue {
            /**
             * Called whenever the markdown of the current leaf is updated.
             */
            update(update: ViewUpdate) {
                // debugger
                console.log('EditingViewPlugin start')
                const markdownLeaves =
                    app.workspace.getLeavesOfType("markdown");
                const activeLeaf = markdownLeaves.find(
                    //@ts-expect-error - private property
                    (leaf) => leaf.view.editor.cm === update.view
                );
                if (!activeLeaf) return;

                loadEmbeddedMindApps(
                    app,
                    manifestPluginVersion,
                    activeLeaf,
                    "source"
                );
            }

            destroy() {
                app.workspace.off(EVENT_APP_RESIZE);
                app.workspace.off(EVENT_APP_CSS_CHANGE)
                app.workspace.off(EVENT_APP_QUICK_PREVIEW)
                app.workspace.off(EVENT_APP_LEAF_CHANGE_ACTIVE)

                app.workspace.off(EVENT_APP_MIND_REFRESH);
                app.workspace.off(EVENT_APP_MIND_EMBEDDED_RESIZE);
                app.workspace.off(EVENT_APP_MIND_NODE_REMARK_PREVIEW)
                app.workspace.off(EVENT_APP_MIND_NODE_REMARK_INPUT_ACTIVE)
                app.workspace.off(EVENT_APP_MIND_NODE_PRIORITY)
                app.workspace.off(EVENT_APP_MIND_EXPORT)

                app.workspace.off(EVENT_MIND_NODE_ACTIVE)
            }
        }
    );
}
