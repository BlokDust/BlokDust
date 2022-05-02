/// <reference path="../../Core/RoutedEventArgs.ts" />

module Fayde.Controls.Primitives {
    export enum ScrollEventType {
        SmallDecrement = 0,
        SmallIncrement = 1,
        LargeDecrement = 2,
        LargeIncrement = 3,
        ThumbPosition = 4,
        ThumbTrack = 5,
        First = 6,
        Last = 7,
        EndScroll = 8,
    }
    Fayde.CoreLibrary.addEnum(ScrollEventType, "ScrollEventType");

    export class ScrollEventArgs extends RoutedEventArgs {
        ScrollEventType: ScrollEventType;
        Value: number;
        constructor(scrollEventType: ScrollEventType, value: number) {
            super();
            Object.defineProperty(this, "ScrollEventType", { value: scrollEventType, writable: false });
            Object.defineProperty(this, "Value", { value: value, writable: false });
        }
    }
    Fayde.CoreLibrary.add(ScrollEventArgs);
}