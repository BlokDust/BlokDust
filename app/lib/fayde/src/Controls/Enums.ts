
module Fayde.Controls {
    export enum TextWrapping {
        NoWrap = 0,
        Wrap = 1,
        WrapWithOverflow = 2,
    }
    Fayde.CoreLibrary.addEnum(TextWrapping, "TextWrapping");

    export enum ScrollBarVisibility {
        Disabled = 0,
        Auto = 1,
        Hidden = 2,
        Visible = 3,
    }
    Fayde.CoreLibrary.addEnum(ScrollBarVisibility, "ScrollBarVisibility");

    export enum TextTrimming {
        None = 0,
        WordEllipsis = 1,
        CharacterEllipsis = 2,
    }
    Fayde.CoreLibrary.addEnum(TextTrimming, "TextTrimming");

    export enum ClickMode {
        Release = 0,
        Press = 1,
        Hover = 2,
    }
    Fayde.CoreLibrary.addEnum(ClickMode, "ClickMode");

    export enum PlacementMode {
        Bottom = 0,
        Right = 1,
        Mouse = 2,
        Left = 3,
        Top = 4,
    }
    Fayde.CoreLibrary.addEnum(PlacementMode, "PlacementMode");

    export enum SelectionMode {
        Single = 0,
        Multiple = 1,
        Extended = 2,
    }
    Fayde.CoreLibrary.addEnum(SelectionMode, "SelectionMode");

    export enum MediaElementState {
        Closed = 0,
        Opening = 1,
        //Individualizing = 2,
        //AcquiringLicense = 3,
        Buffering = 4,
        Playing = 5,
        Paused = 6,
        Stopped = 7
    }
    Fayde.CoreLibrary.addEnum(MediaElementState, "MediaElementState");
}