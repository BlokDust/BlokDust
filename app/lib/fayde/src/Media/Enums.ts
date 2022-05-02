module Fayde.Media {
    export enum BrushMappingMode {
        Absolute = 0,
        RelativeToBoundingBox = 1,
    }
    Fayde.CoreLibrary.addEnum(BrushMappingMode, "BrushMappingMode");

    export enum GradientSpreadMethod {
        Pad = 0,
        Reflect = 1,
        Repeat = 2,
    }
    Fayde.CoreLibrary.addEnum(GradientSpreadMethod, "GradientSpreadMethod");

    export enum Stretch {
        None = 0,
        Fill = 1,
        Uniform = 2,
        UniformToFill = 3,
    }
    Fayde.CoreLibrary.addEnum(Stretch, "Stretch");

    export enum AlignmentX {
        Left = 0,
        Center = 1,
        Right = 2,
    }
    Fayde.CoreLibrary.addEnum(AlignmentX, "AlignmentX");

    export enum AlignmentY {
        Top = 0,
        Center = 1,
        Bottom = 2,
    }
    Fayde.CoreLibrary.addEnum(AlignmentY, "AlignmentY");

    export enum TextHintingMode {
        Fixed = 0,
        Animated = 1,
    }
    Fayde.CoreLibrary.addEnum(TextHintingMode, "TextHintingMode");
}