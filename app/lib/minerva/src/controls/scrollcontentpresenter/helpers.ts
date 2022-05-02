module minerva.controls.scrollcontentpresenter {
    export module helpers {
        export function clampOffsets (sd: IScrollData): boolean {
            var changed = false;

            var clampX = clampHorizontal(sd, sd.cachedOffsetX);
            if (!areClose(clampX, sd.offsetX)) {
                sd.offsetX = clampX;
                changed = true;
            }

            var clampY = clampVertical(sd, sd.cachedOffsetY);
            if (!areClose(clampY, sd.offsetY)) {
                sd.offsetY = clampY;
                changed = true;
            }

            return changed;
        }


        function clampHorizontal (sd: IScrollData, x: number): number {
            if (!sd.canHorizontallyScroll)
                return 0;
            return Math.max(0, Math.min(x, sd.extentWidth - sd.viewportWidth));
        }

        function clampVertical (sd: IScrollData, y: number): number {
            if (!sd.canVerticallyScroll)
                return 0;
            return Math.max(0, Math.min(y, sd.extentHeight - sd.viewportHeight));
        }

        var epsilon: number = 1.192093E-07;
        var adjustment: number = 10;

        function areClose (val1: number, val2: number): boolean {
            if (val1 === val2)
                return true;
            var softdiff = (Math.abs(val1) + Math.abs(val2) + adjustment) * epsilon;
            var diff = val1 - val2;
            return -softdiff < diff && diff < softdiff;
        }
    }
}