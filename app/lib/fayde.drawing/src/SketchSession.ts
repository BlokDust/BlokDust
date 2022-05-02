module Fayde.Drawing {
    export class SketchSession implements ISketchContext {
        private _Canvas: HTMLCanvasElement;
        public Ctx: CanvasRenderingContext2D;

        Width: number;
        Height: number;
        Milliseconds: number;

        constructor (canvas: HTMLCanvasElement, width: number, height: number, milliseconds: number) {
            this._Canvas = canvas;
            this._Canvas.width = width;
            this._Canvas.height = height;
            this.Ctx = canvas.getContext('2d');
            Object.defineProperty(this, 'Width', {value: width, writable: false});
            Object.defineProperty(this, 'Height', { value: height, writable: false });
            this.Milliseconds = milliseconds;
        }
    }
}