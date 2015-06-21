// todo: type App
declare var App: any;
declare var LZMA: any;

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