import IDisplayObject = require("./IDisplayObject");
import Size = Fayde.Utils.Size;

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

class DisplayObject implements IDisplayObject {
    ZIndex: number;
    //RenderCacheCanvas: HTMLCanvasElement;
    //RenderCacheCtx: CanvasRenderingContext2D;
    //IsRenderCached: boolean = false;
    Sketch: Fayde.Drawing.SketchContext;
    Width: number;
    Height: number;
    Position: Point;
    public Timer: Fayde.ClockTimer;
    public LastVisualTick: number = new Date(0).getTime();

    constructor(sketch: Fayde.Drawing.SketchContext){
        this.Sketch = sketch;

        this.Timer = new Fayde.ClockTimer();
        this.Timer.RegisterTimer(this);

        // todo: when drawing, use coordinates relative to origin, width and height, not
        // global context. drawing is done initially to RenderCacheCtx.
        // subsequent draws copy image from RenderCacheCtx and position it globally using Position.
        // setting IsRenderCached = false in derived class forces re-caching.

        //this.RenderCacheCanvas = document.createElement('canvas');
        //this.RenderCacheCanvas.width = this.Width;
        //this.RenderCacheCanvas.height = this.Height;
        //this.RenderCacheCanvas.style.position = "absolute";
        //this.RenderCacheCanvas.style.left = "-10000px";
        //this.RenderCacheCtx = this.RenderCacheCanvas.getContext('2d');
    }

    OnTicked (lastTime: number, nowTime: number) {
        var now = new Date().getTime();
        if (now - this.LastVisualTick < MAX_MSPF) return;
        this.LastVisualTick = now;

        TWEEN.update(nowTime);
    }

    get Ctx(): CanvasRenderingContext2D{
        //if (!this.IsRenderCached) {
        //    return this.RenderCacheCtx;
        //}

        return this.Sketch.Ctx;
    }

    public Draw() {
        //if (window.debug) {
        //    // draw bounding box.
        //    this.Ctx.rect(this.Position.x, this.Position.y, this.Width, this.Height);
        //    this.Ctx.stroke();
        //}

        //if (this.IsRenderCached){
        //    this.Ctx.drawImage(this.RenderCacheCanvas, 0, 0);
        //    console.log("draw from render cache context");
        //}
    }
}

export = DisplayObject;