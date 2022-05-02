module Fayde {
    export enum Orientation {
        Horizontal = 0,
        Vertical = 1,
    }
    Fayde.CoreLibrary.addEnum(Orientation, "Orientation");

    export enum Visibility {
        Visible = 0,
        Collapsed = 1,
    }
    Fayde.CoreLibrary.addEnum(Visibility, "Visibility");
    nullstone.registerEnumConverter(Visibility, function (val: any): any {
        if (val === "true" || val === true || val === Visibility.Visible || val === "Visible")
            return Visibility.Visible;
        return Visibility.Collapsed;
    });

    export enum CursorType {
        Default,
        Hand,
        IBeam,
        Wait,
        SizeNESW,
        SizeNWSE,
        SizeNS,
        SizeWE
        //TODO: Add cursor types
    }
    Fayde.CoreLibrary.addEnum(CursorType, "CursorType");
    export var CursorTypeMappings = {
        Default: "",
        Hand: "pointer",
        IBeam: "text",
        Wait: "wait",
        SizeNESW: "ne-resize",
        SizeNWSE: "nw-resize",
        SizeNS: "n-resize",
        SizeWE: "w-resize"
        //TODO: Add cursor types
    }

    export enum HorizontalAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Stretch = 3,
    }
    Fayde.CoreLibrary.addEnum(HorizontalAlignment, "HorizontalAlignment");

    export enum VerticalAlignment {
        Top = 0,
        Center = 1,
        Bottom = 2,
        Stretch = 3,
    }
    Fayde.CoreLibrary.addEnum(VerticalAlignment, "VerticalAlignment");

    export enum FlowDirection {
        LeftToRight = 0,
        RightToLeft = 1,
    }
    Fayde.CoreLibrary.addEnum(FlowDirection, "FlowDirection");

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
    Fayde.CoreLibrary.addEnum(FontWeight, "FontWeight");

    export enum TextAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Justify = 3,
    }
    Fayde.CoreLibrary.addEnum(TextAlignment, "TextAlignment");

    //FLAGS
    export enum TextDecorations {
        None = 0,
        Underline = 1,
    }
    Fayde.CoreLibrary.addEnum(TextDecorations, "TextDecorations");

    export enum LineStackingStrategy {
        MaxHeight = 0,
        BlockLineHeight = 1,
    }
    Fayde.CoreLibrary.addEnum(LineStackingStrategy, "LineStackingStrategy");
}