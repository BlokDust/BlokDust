module minerva.path {
    export interface IBoundingBox {
        l: number;
        r: number;
        t: number;
        b: number;
    }
    export interface IStrokeParameters {
        strokeThickness: number;
        strokeDashArray: number[];
        strokeDashCap: PenLineCap;
        strokeDashOffset: number;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;
        strokeStartLineCap: PenLineCap;
    }
    export interface IPathSegment {
        sx: number;
        sy: number;
        ex: number;
        ey: number;
        isSingle: boolean;
        draw: (canvasCtx: CanvasRenderingContext2D) => void;
        extendFillBox: (box: IBoundingBox) => void;
        extendStrokeBox: (box: IBoundingBox, pars: IStrokeParameters) => void;
        //Start Vector must be in direction of path at start
        getStartVector(): number[];
        //End Vector must be in direction of path at end
        getEndVector(): number[];
    }
}