import ISketchContext = Fayde.Drawing.ISketchContext;

interface IDisplayObject {
    Ctx: CanvasRenderingContext2D;
    Draw(): void;
    Height: number;
    Init(sketch?: ISketchContext): void;
    Initialised: boolean;
    IsPaused: boolean;
    Pause(): void;
    Play(): void;
    Position: Point;
    Setup(): void;
    Update(): void;
    Width: number;
    ZIndex: number;

}

export = IDisplayObject;