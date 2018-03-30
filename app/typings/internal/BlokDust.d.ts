declare var LZMA: any;
declare var PixelPalette;

interface Window{
    debug: boolean;
    SC: any;
    trackEvent(category: string, action: string, label?: string);
    trackVariable(name: string, value: string);
    TWEEN: any;
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


/**
 * Temporary AudioBufferSourceNode extention to add detune. 
 * Can delete this once lib.d.ts includes it.
 */
// interface AudioBufferSourceNode extends AudioNode {
//     detune: AudioParam;
// }