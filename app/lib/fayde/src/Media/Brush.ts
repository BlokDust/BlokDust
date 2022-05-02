/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Media {
    export class Brush extends DependencyObject implements minerva.IBrush {
        static TransformProperty = DependencyProperty.RegisterCore("Transform", () => Media.Transform, Brush);
        Transform: Media.Transform;

        private _CachedBounds: minerva.Rect = null;
        private _CachedBrush: any = null;

        constructor () {
            super();
            XamlNode.SetShareable(this.XamlNode);
        }

        isTransparent (): boolean {
            //TODO: Can we be clever with implementations?
            return false;
        }

        setupBrush (ctx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            if (this._CachedBrush && this._CachedBounds && minerva.Rect.isEqual(this._CachedBounds, bounds))
                return;
            this._CachedBounds = new minerva.Rect(bounds.x, bounds.y, bounds.width, bounds.height);

            var transform = this.Transform;
            if (transform) {
                var transformedBounds = transform.TransformBounds(bounds);
                var raw = transform.Value._Raw;

                var tmpBrush = this.CreateBrush(ctx, bounds);
                var fillExtents = new minerva.Rect();
                minerva.Rect.copyTo(bounds, fillExtents);
                minerva.Rect.grow(fillExtents, raw[4], raw[5], 0, 0);

                var tmpCanvas = <HTMLCanvasElement>document.createElement("canvas");
                tmpCanvas.width = Math.max(transformedBounds.width, bounds.width);
                tmpCanvas.height = Math.max(transformedBounds.height, bounds.height);
                var tmpCtx = <CanvasRenderingContext2D>tmpCanvas.getContext("2d");
                tmpCtx.setTransform(raw[0], raw[1], raw[2], raw[3], raw[4], raw[5]);
                tmpCtx.fillStyle = tmpBrush;
                tmpCtx.fillRect(fillExtents.x, fillExtents.y, fillExtents.width, fillExtents.height);

                this._CachedBrush = ctx.createPattern(tmpCanvas, "no-repeat");
            } else {
                this._CachedBrush = this.CreateBrush(ctx, bounds);
            }
        }

        toHtml5Object (): any {
            return this._CachedBrush;
        }

        CreateBrush (ctx: CanvasRenderingContext2D, bounds: minerva.Rect): any {
            return undefined;
        }

        InvalidateBrush () {
            this._CachedBrush = null;
            this._CachedBounds = null;
            Incite(this);
        }
    }
    Fayde.CoreLibrary.add(Brush);

    module reactions {
        DPReaction<Media.Transform>(Brush.TransformProperty, (brush: Brush, ov, nv) => brush.InvalidateBrush());
    }
}