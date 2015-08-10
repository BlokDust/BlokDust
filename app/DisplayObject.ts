import IDisplayObject = require("./IDisplayObject");

var MAX_FPS: number = 100;
var MAX_MSPF: number = 1000 / MAX_FPS;

class DisplayObject implements IDisplayObject {
    ZIndex: number;
    Sketch: any;
    Width: number;
    Height: number;
    Position: Point;
    Initialised: boolean = false;
    public Timer: Fayde.ClockTimer;
    public LastVisualTick: number = new Date(0).getTime();

    Init(sketch?: any): void {
        if (sketch) this.Sketch = sketch;
        if (!this.Sketch) throw new Exception("Sketch not specified for DisplayObject");

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

    public Draw() {
    }

    public Dispose(): void {
    }

    // todo: this is more of a util than something DisplayObject-specific
    // IS CLICK WITHIN THIS BOX //
    HitRect(x,y,w,h,mx,my) {
        var hit;
        if (mx>x && mx<(x+w) && my>y && my<(y+h)) {
            hit = true;
            //App.Canvas.style.cursor="pointer";
        } else {
            hit = false;
        }
        return hit;
    }
}

export = DisplayObject;