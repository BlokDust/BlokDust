module minerva {
    export interface IBrush {
        isTransparent(): boolean;
        setupBrush(ctx: CanvasRenderingContext2D, region: Rect);
        toHtml5Object(): any;
    }

    /*
     function isBrushTransparent (brush: IBrush) {
     if (!brush)
     return true;
     if (brush instanceof Media.SolidColorBrush)
     return (<Media.SolidColorBrush>brush).Color.A < 1.0;
     if (brush instanceof Media.LinearGradientBrush) {
     var enumerator = (<Media.LinearGradientBrush>brush).GradientStops.getEnumerator();
     while (enumerator.moveNext()) {
     if (enumerator.current.Color.A < 1.0)
     return true;
     }
     return false;
     }
     return true;
     }
     */

    export class FakeBrush implements IBrush {
        constructor (public raw: any) {
        }

        isTransparent (): boolean {
            return false;
        }

        setupBrush (ctx: CanvasRenderingContext2D, region: Rect): any {
        }

        toHtml5Object (): any {
            return this.raw;
        }
    }
}