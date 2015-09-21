import IDisplayObject = require("./IDisplayObject");
import ISketchContext = Fayde.Drawing.ISketchContext;

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

class DisplayObject implements IDisplayObject {
    Height: number;
    Initialised: boolean = false;
    Position: Point;
    IsPaused: boolean = false;
    public FrameCount: number = 0;
    public LastVisualTick: number = new Date(0).getTime();
    public Timer: Fayde.ClockTimer;
    Sketch: any;
    Width: number;
    ZIndex: number;

    Init(sketch?: any): void {
        this.Sketch = sketch;
        this.StartAnimating();
        this.Initialised = true;
    }

    StartAnimating(): void {
        this.Timer = new Fayde.ClockTimer();
        this.Timer.RegisterTimer(this);
    }

    OnTicked (lastTime: number, nowTime: number) {
        var now = new Date().getTime();
        if (now - this.LastVisualTick < MAX_MSPF) return;
        this.LastVisualTick = now;

        TWEEN.update(nowTime);
    }

    get Ctx(): CanvasRenderingContext2D{
        return this.Sketch.Ctx;
    }

    public Setup(): void {

    }

    public Draw(): void {
        this.FrameCount++;
    }

    public Dispose(): void {
    }

    public Play(): void {
        this.IsPaused = false;
    }

    public Pause(): void {
        this.IsPaused = true;
    }

    HitRect(x, y, w, h, mx, my): boolean {
        return Utils.Measurements.Dimensions.HitRect(x, y, w, h, mx, my);
    }

    Update(): void {

    }
}

export = DisplayObject;