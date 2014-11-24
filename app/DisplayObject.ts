import IDisplayObject = require("./IDisplayObject");
import Size = Fayde.Utils.Size;

class DisplayObject implements IDisplayObject {
    ZIndex: number;
    RenderCacheEnabled: boolean = true;
    RenderCache: CanvasRenderingContext2D;
    Ctx: CanvasRenderingContext2D;
    //CtxSize: Size;

    constructor(ctx: CanvasRenderingContext2D){
        this.Ctx = ctx;
    }

    // causes the PreRenderImage to be redrawn
    public InvalidateRenderCache(): void {
        this.RenderCache = null;
    }

    public Draw() {
        //if (this.RenderCacheEnabled && !this.RenderCache){
        //    this.Draw(this.RenderCache);
        //} else {
        //
        //}
    }
}

export = DisplayObject;