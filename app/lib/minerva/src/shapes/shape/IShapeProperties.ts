module minerva.shapes.shape {
    export interface IShapeProperties {
        fill: IBrush;
        stretch: Stretch;
        stroke: IBrush;
        strokeThickness: number;
        strokeDashArray: number[];
        strokeDashCap: PenLineCap;
        strokeDashOffset: number;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;
        strokeStartLineCap: PenLineCap;
    }
}