module minerva {
    export interface IScrollData {
        canHorizontallyScroll: boolean;
        canVerticallyScroll: boolean;
        offsetX: number;
        offsetY: number;
        cachedOffsetX: number;
        cachedOffsetY: number;
        viewportWidth: number;
        viewportHeight: number;
        extentWidth: number;
        extentHeight: number;
        maxDesiredWidth: number;
        maxDesiredHeight: number;
        invalidate();
    }
}