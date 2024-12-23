interface MindMapOptions {
    // 容器DOM元素或选择器
    el: HTMLElement | string;
    // 主题
    theme?: string;
    // 布局方式
    layout?: string;
    // 数据
    data?: {
        // 根节点文本
        text: string;
        // 是否展开
        expand?: boolean;
        // 子节点
        children?: any[];
        // 其他自定义数据
        [key: string]: any;
    };
    // 拖动时的行为
    dragMoveStep?: number;
    // 缩放配置
    scale?: {
        min?: number;  // 最小缩放比例
        max?: number;  // 最大缩放比例
        step?: number; // 缩放步长
    };
    // 键盘快捷键
    keyCommand?: boolean;
    // 小地图配置
    miniMap?: {
        enable?: boolean;
        width?: number;
        height?: number;
    };
}

interface MindMap {
    // 构造函数
    new (options: MindMapOptions): MindMap;

    // 属性
    container: HTMLElement;      // 容器元素
    renderer: any;              // 渲染器
    view: any;                  // 视图
    keyCommand: {              // 快捷键控制
        pause(): void;         // 暂停快捷键
        resume(): void;        // 恢复快捷键
    };
    miniMap: {                 // 小地图
        calculationMiniMap(width: number, height: number): any;
    };

    // 方法
    on(event: string, callback: Function): void;           // 监听事件
    off(event: string, callback: Function): void;          // 移除事件监听
    removeAllListeners(): void;                           // 移除所有事件监听
    destroy(): void;                                      // 销毁实例
    resize(): void;                                       // 调整大小
    setTheme(theme: string): void;                        // 设置主题
    getData(): any;                                       // 获取数据
    setData(data: any): void;                            // 设置数据
    export(...args: any[]): void;                        // 导出
}

export { MindMap, MindMapOptions };