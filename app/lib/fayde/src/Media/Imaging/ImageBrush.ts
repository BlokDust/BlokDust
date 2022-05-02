/// <reference path="../TileBrush.ts"/>

module Fayde.Media.Imaging {
    export class ImageBrush extends TileBrush implements IImageChangedListener {
        private static _SourceCoercer(d: DependencyObject, propd: DependencyProperty, value: any): any {
            if (typeof value === "string")
                return new Media.Imaging.BitmapImage(new Uri(value));
            if (value instanceof Uri)
                return new Media.Imaging.BitmapImage(value);
            return value;
        }
        static ImageSourceProperty = DependencyProperty.RegisterFull("ImageSource", () => ImageSource, ImageBrush, undefined, (d: ImageBrush, args) => d._ImageSourceChanged(args), ImageBrush._SourceCoercer);
        ImageSource: ImageSource;
        ImageFailed = new nullstone.Event();
        ImageOpened = new nullstone.Event();

        setupBrush(ctx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            var source = this.ImageSource;
            if (source && source.image)
                super.setupBrush(ctx, bounds);
        }
        GetTileExtents(): minerva.Rect {
            var source = this.ImageSource;
            return new minerva.Rect(0, 0, source.pixelWidth, source.pixelHeight);
        }
        DrawTile(canvasCtx: CanvasRenderingContext2D, bounds: minerva.Rect) {
            var source = this.ImageSource;
            canvasCtx.rect(0, 0, source.pixelWidth, source.pixelHeight);
            canvasCtx.fillStyle = canvasCtx.createPattern(source.image, "no-repeat");
            canvasCtx.fill();
        }
        private _ImageSourceChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldSrc: BitmapSource;
            if ((oldSrc = args.OldValue) && (oldSrc instanceof BitmapSource))
                oldSrc.Unlisten(this);
            var newSrc: BitmapSource;
            if ((newSrc = args.NewValue) && (newSrc instanceof BitmapSource))
                newSrc.Listen(this);
            this.InvalidateBrush();
        }
        OnImageErrored(source: BitmapSource, e: Event) { this.ImageFailed.raise(this, null); }
        OnImageLoaded(source: BitmapSource, e: Event) { this.ImageOpened.raise(this, null); }
        ImageChanged(source: BitmapSource) {
            this.InvalidateBrush();
        }
    }
    Fayde.CoreLibrary.add(ImageBrush);
}