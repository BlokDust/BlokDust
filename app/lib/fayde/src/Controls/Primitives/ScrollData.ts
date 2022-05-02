module Fayde.Controls.Primitives {
    export class ScrollData implements minerva.IScrollData {
        canHorizontallyScroll: boolean = false;
        canVerticallyScroll: boolean = false;
        offsetX: number = 0;
        offsetY: number = 0;
        cachedOffsetX: number = 0;
        cachedOffsetY: number = 0;
        viewportWidth: number = 0;
        viewportHeight: number = 0;
        extentWidth: number = 0;
        extentHeight: number = 0;
        maxDesiredWidth: number = 0;
        maxDesiredHeight: number = 0;

        scrollOwner: ScrollViewer = null;

        invalidate () {
            if (this.scrollOwner)
                this.scrollOwner.InvalidateScrollInfo();
        }
    }
}