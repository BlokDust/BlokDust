/// <reference path="../IApp.ts"/>

// todo: type App
declare var App: any;

interface Window{
    App: any;
    debug: boolean;
    SC: any;
    LZMA: any;
}

interface Document{
    selection: any;
}

interface CanvasRenderingContext2D {
    divisor: number;
}