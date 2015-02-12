import Size = Fayde.Utils.Size;

interface IDisplayObject {
    ZIndex: number;
    //RenderCacheCanvas: HTMLCanvasElement;
    //RenderCacheCtx: CanvasRenderingContext2D;
    Ctx: CanvasRenderingContext2D;
    Draw: () => void;
    Width: number;
    Height: number;
    Position: Point;
}

export = IDisplayObject;