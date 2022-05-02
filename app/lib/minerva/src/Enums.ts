module minerva {
    export enum Orientation {
        Horizontal = 0,
        Vertical = 1,
    }

    export enum PenLineJoin {
        Miter = 0,
        Bevel = 1,
        Round = 2,
    }

    export enum PenLineCap {
        Flat = 0,
        Square = 1,
        Round = 2,
        Triangle = 3,
    }

    export enum FillRule {
        EvenOdd = 0,
        NonZero = 1,
    }

    export enum Stretch {
        None = 0,
        Fill = 1,
        Uniform = 2,
        UniformToFill = 3,
    }

    export enum FlowDirection {
        LeftToRight = 0,
        RightToLeft = 1,
    }

    export enum LineStackingStrategy {
        MaxHeight = 0,
        BlockLineHeight = 1,
    }

    export enum TextAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Justify = 3,
    }

    export enum TextTrimming {
        None = 0,
        WordEllipsis = 1,
        CharacterEllipsis = 2,
    }

    export enum TextWrapping {
        NoWrap = 0,
        Wrap = 1,
        WrapWithOverflow = 2,
    }

    export enum TextDecorations {
        None = 0,
        Underline = 1,
    }

    export enum FontWeight {
        Thin = 100,
        ExtraLight = 200,
        Light = 300,
        Normal = 400,
        Medium = 500,
        SemiBold = 600,
        Bold = 700,
        ExtraBold = 800,
        Black = 900,
        ExtraBlack = 950,
    }

    export enum SweepDirection {
        Counterclockwise = 0,
        Clockwise = 1,
    }
}
