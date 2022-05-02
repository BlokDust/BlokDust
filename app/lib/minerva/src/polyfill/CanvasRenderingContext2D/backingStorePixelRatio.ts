interface CanvasRenderingContext2D {
    backingStorePixelRatio: number;
}
if (!CanvasRenderingContext2D.prototype.hasOwnProperty("backingStorePixelRatio")) {
    Object.defineProperty(CanvasRenderingContext2D.prototype, "backingStorePixelRatio", {
        get: function (): number {
            var ctx = <any>this;
            return ctx.webkitBackingStorePixelRatio
                || ctx.mozBackingStorePixelRatio
                || ctx.msBackingStorePixelRatio
                || ctx.oBackingStorePixelRatio
                || 1;
        }
    });
}