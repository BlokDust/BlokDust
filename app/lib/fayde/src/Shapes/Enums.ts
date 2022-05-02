module Fayde.Shapes {
    export enum ShapeFlags {
        None = 0,
        Empty = 1,
        Normal = 2,
        Degenerate = 4,
        Radii = 8,
    }

    export enum PenLineCap {
        Flat = 0,
        Square = 1,
        Round = 2,
        Triangle = 3,
    }
    Fayde.CoreLibrary.addEnum(PenLineCap, "PenLineCap");

    export enum PenLineJoin {
        Miter = 0,
        Bevel = 1,
        Round = 2,
    }
    Fayde.CoreLibrary.addEnum(PenLineJoin, "PenLineJoin");

    export enum FillRule {
        EvenOdd = 0,
        NonZero = 1,
    }
    Fayde.CoreLibrary.addEnum(FillRule, "FillRule");

    export enum SweepDirection {
        Counterclockwise = 0,
        Clockwise = 1,
    }
    Fayde.CoreLibrary.addEnum(SweepDirection, "SweepDirection");
}