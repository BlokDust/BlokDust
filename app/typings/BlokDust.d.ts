declare var LZMA: any;
declare var PixelPalette;

interface Window{
    debug: boolean;
    SC: any;
    trackEvent(category: string, action: string, label: string, value?: number);
    trackVariable(slot: number, name: string, value: string, scope: number);
}

interface Document{
    selection: any;
}

interface CanvasRenderingContext2D {
    divisor: number;
    webkitBackingStorePixelRatio: number;
    mozBackingStorePixelRatio: number;
    msBackingStorePixelRatio: number;
    oBackingStorePixelRatio: number;
}

interface Float32Array {
    /**
     * Reverses the elements in an Array.
     */
    prototype: any;

    reverse(): Float32Array;

}