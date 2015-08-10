// todo: type App
declare var App: any;
declare var LZMA: any;
declare var PixelPalette;

interface Window{
    App: any;
    debug: boolean;
    SC: any;
}

interface Document{
    selection: any;
}

interface CanvasRenderingContext2D {
    divisor: number;
}

interface Float32Array {
    /**
     * Reverses the elements in an Array.
     */
    prototype: any;

    reverse(): Float32Array;

}