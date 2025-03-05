// declare module 'simple-mind-map' {
//   export default class MindMap {
//     constructor(options: any);
//     on(event: string, callback: Function): void;
//     off(event: string, callback: Function): void;
//     removeAllListeners(): void;
//     destroy(): void;
//     keyCommand: {
//       pause(): void;
//       recovery(): void;
//     };
//     renderer: {
//       activeNodeList: any[];
//       root: any;
//       textEdit: any;
//       moveNodeToCenter(node: any): void;
//     };
//     execCommand(command: string, ...args: any[]): void;
//     getData(data?: boolean): any;
//     setTheme(theme: string): void;
//     resize(): void;
//     reRender(callback?: Function, type?: string): void;
//   }
// }

// declare module 'simple-mind-map/src/plugins' {
//   export const Drag: any;
//   export const KeyboardNavigation: any;
//   export const MiniMap: any;
//   export const Export: any;
//   export const ExportPDF: any;
// } 