/// <reference path="./refs" />

class SketchContext {

    public _Ctx: CanvasRenderingContext2D;
    private _Width: number;
    private _Height: number;

    get Ctx(): CanvasRenderingContext2D {
        return this._Ctx;
    }

    set Ctx(value: CanvasRenderingContext2D){
        this._Ctx = value;
        this._Width = this.Ctx.canvas.width;
        this._Height = this.Ctx.canvas.height;
    }

    get Width(): number {
        return this._Width;
    }

    get Height(): number {
        return this._Height;
    }

    constructor() {

    }

    Draw(){

    }
}

export = SketchContext;