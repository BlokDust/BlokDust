module minerva.core.render {
    //NOTE: If we resize the HTML5 canvas during resize, the canvas will go blank until render happens
    var epsilon = 1e-10;
    export class RenderContextSize {
        private $$ctx: CanvasRenderingContext2D = null;
        //NOTE: This is the desired on-screen size (backing size for high-dpi devices will be larger)
        private $$desiredWidth: number = 0;
        private $$desiredHeight: number = 0;
        private $$changed: ISize = null;
        private $$lastDpiRatio = 1;

        get desiredWidth(): number {
            return this.$$desiredWidth;
        }

        get desiredHeight(): number {
            return this.$$desiredHeight;
        }

        get paintWidth(): number {
            return this.$$desiredWidth * this.dpiRatio;
        }

        get paintHeight(): number {
            return this.$$desiredHeight * this.dpiRatio;
        }

        get dpiRatio(): number {
            return (window.devicePixelRatio || 1) / this.$$ctx.backingStorePixelRatio;
        }

        init(ctx: CanvasRenderingContext2D) {
            this.$$ctx = ctx;
            var desired = getNaturalCanvasSize(ctx.canvas);
            this.$$desiredWidth = desired.width;
            this.$$desiredHeight = desired.height;
            this.$adjustCanvas();
        }

        queueResize(width: number, height: number): RenderContextSize {
            if (this.$$changed) {
                this.$$changed.width = width;
                this.$$changed.height = height;
            } else {
                this.$$changed = {
                    width: width,
                    height: height
                };
            }
            return this;
        }

        commitResize(): RenderContextSize {
            if (this.$$changed) {
                //Don't resize anything if movement is not noticeable
                if (Math.abs(this.$$changed.width - this.$$desiredWidth) < epsilon && Math.abs(this.$$changed.height - this.$$desiredHeight) < epsilon)
                    return;
                this.$$desiredWidth = this.$$changed.width;
                this.$$desiredHeight = this.$$changed.height;
                this.$$changed = null;
                this.$adjustCanvas();
            }
            return this;
        }

        updateDpiRatio(): boolean {
            if (this.$$lastDpiRatio === this.dpiRatio)
                return false;
            this.$adjustCanvas();
            return true;
        }

        private $adjustCanvas() {
            var canvas = this.$$ctx.canvas;
            var dpiRatio = this.dpiRatio;
            if (Math.abs(dpiRatio - 1) < epsilon) {
                canvas.width = this.desiredWidth;
                canvas.height = this.desiredHeight;
            } else {
                // Size the canvas width and height (the virtual canvas size) to the scaled up pixel count.
                canvas.width = this.paintWidth;
                canvas.height = this.paintHeight;
                // Size the physical canvas using CSS width and height to the pixel dimensions.
                canvas.style.width = this.desiredWidth.toString() + "px";
                canvas.style.height = this.desiredHeight.toString() + "px";
            }
            this.$$lastDpiRatio = dpiRatio;
        }
    }
}