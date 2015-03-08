
import _App = require("../App");

declare var App: _App;

interface Window{
    App: _App;
    debug: boolean;
}

interface CanvasRenderingContext2D {
    divisor: number;
}