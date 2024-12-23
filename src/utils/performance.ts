import { debounce } from 'lodash-es';

export const useResizeObserver = (
    element: HTMLElement,
    callback: ResizeObserverCallback
) => {
    const observer = new ResizeObserver(callback);
    observer.observe(element);
    
    return () => observer.disconnect();
};

export const useDebouncedMethod = <T extends (...args: any[]) => any>(
    fn: T,
    delay: number
) => {
    return debounce(fn, delay, {
        leading: true,
        trailing: true
    });
}; 