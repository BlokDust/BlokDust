import Size = minerva.Size;
import {IDisplayContext} from './IDisplayContext';

export class Canvas implements IDisplayContext {

    private _Canvas: HTMLCanvasElement;

    constructor() {
        this._Canvas = document.createElement("canvas");
        document.body.appendChild(this._Canvas);
    }

    //todo: typing as CanvasRenderingContext2D causes "Property 'fillStyle' is missing in type 'WebGLRenderingContext'"
    // upgrade to newer compiler (1.5) which has no error - requires gulp as grunt-typescript seemingly no longer supported
    get Ctx(): any {
        return this._Canvas.getContext("2d");
    }

    get Width(): number {
        return this.Ctx.canvas.width;
    }

    set Width(value: number) {
        this.Ctx.canvas.width = value;
    }

    get Height(): number {
        return this.Ctx.canvas.height;
    }

    set Height(value: number) {
        this.Ctx.canvas.height = value;
    }

    get Size(): Size {
        return new Size(this.Width, this.Height);
    }

    get Style(): any {
        return this.Ctx.canvas.style;
    }
}