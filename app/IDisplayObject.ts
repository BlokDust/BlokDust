
interface IDisplayObject {
    ZIndex: number;
    //RenderCacheCanvas: HTMLCanvasElement;
    //RenderCacheCtx: CanvasRenderingContext2D;
    Ctx: CanvasRenderingContext2D;
    Init: (sketch?: any) => void;
    Initialised: boolean;
    Draw: () => void;
    Width: number;
    Height: number;
    Position: Point;
}

export = IDisplayObject;