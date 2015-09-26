import ISketchContext = Fayde.Drawing.ISketchContext;

export interface IDisplayObject extends ISketchContext{
    Ctx: CanvasRenderingContext2D;
    Draw(): void;
    Height: number;
    Init(sketch?: ISketchContext): void;
    Initialised: boolean;
    IsPaused: boolean;
    IsVisible: boolean;
    Pause(): void;
    Play(): void;
    Position: Point;
    Setup(): void;
    Update(): void;
    Width: number;
    ZIndex: number;
}
