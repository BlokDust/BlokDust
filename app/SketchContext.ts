/// <reference path="./refs" />

class SketchContext {

    private _IsSetup: boolean = false;
    private _SketchSession: Fayde.Drawing.SketchSession;
    public FrameCount: number = 0;

    set SketchSession(value: Fayde.Drawing.SketchSession){
        // if this is the first time the SketchSession has been set, call Setup
        // as there is now a context with dimensions to work with.
        this._SketchSession = value;

        if (!this._IsSetup){
            this.Setup();
            this._IsSetup = true;
        }

        this.Draw();
    }

    get SketchSession (): Fayde.Drawing.SketchSession{
        return this._SketchSession;
    }

    get Ctx(): CanvasRenderingContext2D {
        return this.SketchSession.Ctx;
    }

    get Width(): number {
        return this.Ctx.canvas.width;
    }

    get Height(): number {
        return this.Ctx.canvas.height;
    }

    get Milliseconds(): number {
        return this.SketchSession.Milliseconds;
    }

    constructor() {

    }

    Setup() {

    }

    Draw(){
        this.FrameCount++;
    }
}

export = SketchContext;