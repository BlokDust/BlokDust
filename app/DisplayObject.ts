import {IDisplayObject} from './IDisplayObject';
import ISketchContext = Fayde.Drawing.ISketchContext;

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

export class DisplayObject implements IDisplayObject {

    public FrameCount: number = 0;
    public Height: number;
    public Initialised: boolean = false;
    public IsPaused: boolean = false;
    public LastVisualTick: number = new Date(0).getTime();
    public Position: Point;
    public Sketch: any;
    public Timer: Fayde.ClockTimer;
    public Width: number;
    public ZIndex: number;

    Init(sketch: ISketchContext): void {
        this.Sketch = sketch;

        this.Setup();
        this.Update();
        this.Draw();

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
