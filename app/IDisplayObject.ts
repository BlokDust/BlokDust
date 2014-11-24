import Size = Fayde.Utils.Size;

interface IDisplayObject {
    ZIndex: number;
    RenderCache: any; // image, canvas or video
    //CtxSize: Size;
    Ctx: CanvasRenderingContext2D;
    //Update: (ctx: CanvasRenderingContext2D) => void;
    Draw: () => void;
}

export = IDisplayObject;