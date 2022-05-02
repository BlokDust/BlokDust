/// <reference path="GradientBrush.ts" />

module Fayde.Media {
    export class LinearGradientBrush extends GradientBrush {
        static StartPointProperty = DependencyProperty.RegisterCore("StartPoint", () => Point, LinearGradientBrush, undefined, (d: LinearGradientBrush, args) => d.InvalidateBrush());
        static EndPointProperty = DependencyProperty.RegisterCore("EndPoint", () => Point, LinearGradientBrush, undefined, (d: LinearGradientBrush, args) => d.InvalidateBrush());
        StartPoint: Point;
        EndPoint: Point;

        CreatePad (ctx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            var data = this._GetPointData(bounds);
            var grd = ctx.createLinearGradient(data.start.x, data.start.y, data.end.x, data.end.y);
            for (var en = this.GradientStops.getEnumerator(); en.moveNext();) {
                var stop: GradientStop = en.current;
                grd.addColorStop(stop.Offset, stop.Color.toString());
            }
            return grd;
        }

        CreateRepeat (ctx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            var data = this._GetPointData(bounds);
            return this.CreateInterpolated(ctx, LinearGradient.createRepeatInterpolator(data.start, data.end, bounds));
        }

        CreateReflect (ctx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            var data = this._GetPointData(bounds);
            return this.CreateInterpolated(ctx, LinearGradient.createReflectInterpolator(data.start, data.end, bounds));
        }

        private CreateInterpolated (ctx: CanvasRenderingContext2D, interpolator: LinearGradient.IInterpolator) {
            var grd = ctx.createLinearGradient(interpolator.x0, interpolator.y0, interpolator.x1, interpolator.y1);
            var allStops = this.GradientStops.getPaddedEnumerable();
            for (; interpolator.step();) {
                for (var en = allStops.getEnumerator(); en.moveNext();) {
                    var stop = en.current;
                    var offset = interpolator.interpolate(stop.Offset);
                    if (offset >= 0 && offset <= 1)
                        grd.addColorStop(offset, stop.Color.toString());
                }
            }
            return grd;
        }

        private _GetPointData (bounds: minerva.Rect) {
            var start = this.StartPoint;
            start = !start ? new Point(0.0, 0.0) : start.Clone();
            var end = this.EndPoint;
            end = !end ? new Point(1.0, 1.0) : end.Clone();

            if (this.MappingMode !== BrushMappingMode.Absolute) {
                start.x *= bounds.width;
                start.y *= bounds.height;
                end.x *= bounds.width;
                end.y *= bounds.height;
            }
            start.x += bounds.x;
            start.y += bounds.y;
            end.x += bounds.x;
            end.y += bounds.y;
            return {
                start: start,
                end: end
            };
        }

        toString (): string {
            var ser = [];
            for (var en = this.GradientStops.getEnumerator(); en.moveNext();) {
                ser.push(en.current.toString());
            }
            return "LinearGradientBrush(" + this.StartPoint.toString() + " --> " + this.EndPoint.toString() + " [" + ser.toString() + "])";
        }
    }
    Fayde.CoreLibrary.add(LinearGradientBrush);
}