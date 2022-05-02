module Fayde.Drawing.sketch {
    export interface ISketcher {
        (canvas: HTMLCanvasElement, width: number, height: number);
    }
}