import {PluginValue, ViewPlugin, ViewUpdate} from "@codemirror/view";

import {loadEmbeddedLoomApps} from "./embedded/embedded-app-manager";
import {App} from "obsidian";
import {EVENT_APP_EMBEDDED_RESIZE, EVENT_APP_REFRESH, MARKMIND_DEFAULT_DATA} from "./constants/constant";

export default function EditingViewPlugin(
    app: App,
    manifestPluginVersion: string
) {
    return ViewPlugin.fromClass(
        /**
         * This plugin is responsible for rendering the loom app in live preview mode.
         * It is instantiated for each open leaf
         */
        class EditingViewPlugin implements PluginValue {
            /**
             * Called whenever the markdown of the current leaf is updated.
             */
            update(update: ViewUpdate) {
                // debugger
                // console.log('EditingViewPlugin start')
                const markdownLeaves =
                    app.workspace.getLeavesOfType("markdown");
                const activeLeaf = markdownLeaves.find(
                    //@ts-expect-error - private property
                    (leaf) => leaf.view.editor.cm === update.view
                );
                if (!activeLeaf) return;

                loadEmbeddedLoomApps(
                    app,
                    manifestPluginVersion,
                    activeLeaf,
                    "source"
                );
            }

            destroy() {
                app.workspace.off(EVENT_APP_REFRESH);
                app.workspace.off(EVENT_APP_EMBEDDED_RESIZE);
                app.workspace.off('resize');
                app.workspace.off("css-change")
                app.workspace.off("quick-preview")
                app.workspace.off("active-leaf-change")

                app.workspace.off("showNoteContent")
                app.workspace.off("hideNoteContent")
                app.workspace.off("node_active")
                console.log("销毁编辑插件")
            }
        }
    );
}
