/// <reference path="../IApp.ts"/>

// todo: type App
declare var App: any;

interface Window{
    App: any;
    debug: boolean;
}

interface CanvasRenderingContext2D {
    divisor: number;
}