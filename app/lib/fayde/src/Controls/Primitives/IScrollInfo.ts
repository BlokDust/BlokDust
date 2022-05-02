module Fayde.Controls.Primitives {
    export interface IScrollInfo {
        ScrollOwner: ScrollViewer;

        LineUp(): boolean;
        LineDown(): boolean;
        LineLeft(): boolean;
        LineRight(): boolean;

        MouseWheelUp(): boolean;
        MouseWheelDown(): boolean;
        MouseWheelLeft(): boolean;
        MouseWheelRight(): boolean;

        PageUp(): boolean;
        PageDown(): boolean;
        PageLeft(): boolean;
        PageRight(): boolean;

        MakeVisible(uie: UIElement, rectangle: minerva.Rect): minerva.Rect;

        SetHorizontalOffset(offset: number): boolean;
        SetVerticalOffset(offset: number): boolean;

        CanHorizontallyScroll: boolean;
        CanVerticallyScroll: boolean;
        ExtentHeight: number;
        ExtentWidth: number;
        HorizontalOffset: number;
        VerticalOffset: number;
        ViewportHeight: number;
        ViewportWidth: number;
    }
    export var IScrollInfo_ = new nullstone.Interface<IScrollInfo>("IScrollInfo");
}