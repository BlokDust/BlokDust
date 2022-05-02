/// <reference path="ImageSource.ts"/>

module Fayde.Media.Imaging {
    declare var Info;

    export interface IImageChangedListener {
        OnImageErrored(source: BitmapSource, e: Event);
        OnImageLoaded(source: BitmapSource, e: Event);
        ImageChanged(source: BitmapSource);
    }

    function intGreaterThanZeroValidator (instance: DependencyObject, propd: DependencyProperty, value: any) {
        if (typeof value !== "number")
            return false;
        return value > 0;
    }

    export class BitmapSource extends ImageSource {
        static PixelWidthProperty = DependencyProperty.RegisterFull("PixelWidth", () => Number, BitmapSource, 0, undefined, undefined, undefined, intGreaterThanZeroValidator);
        static PixelHeightProperty = DependencyProperty.RegisterFull("PixelHeight", () => Number, BitmapSource, 0, undefined, undefined, undefined, intGreaterThanZeroValidator);
        PixelWidth: number;
        PixelHeight: number;

        private _Listener: IImageChangedListener = null;
        private _Image: HTMLImageElement;

        get pixelWidth (): number {
            return this.GetValue(BitmapSource.PixelWidthProperty);
        }

        get pixelHeight (): number {
            return this.GetValue(BitmapSource.PixelHeightProperty);
        }

        get image (): HTMLImageElement {
            return this._Image;
        }


        ResetImage () {
            this._Image = new Image();
            this._Image.onerror = (e) => this._OnErrored(e);
            this._Image.onload = (e) => this._OnLoad(e);
            this.PixelWidth = 0;
            this.PixelHeight = 0;
            var listener = this._Listener;
            if (listener) listener.ImageChanged(this);
        }

        UriSourceChanged (oldValue: Uri, newValue: Uri) {
            if (!this._Image || !newValue)
                this.ResetImage();
            this._Image.src = TypeManager.resolveResource(newValue);
            var listener = this._Listener;
            if (listener) listener.ImageChanged(this);
        }

        Listen (listener: IImageChangedListener) {
            this._Listener = listener;
        }

        Unlisten (listener: IImageChangedListener) {
            if (this._Listener === listener) this._Listener = null;
        }

        _OnErrored (e: Event) {
            console.info("Failed to load: " + this._Image.src.toString());
            var listener = this._Listener;
            if (listener)
                listener.OnImageErrored(this, e);
        }

        _OnLoad (e: Event) {
            this.PixelWidth = this._Image.naturalWidth;
            this.PixelHeight = this._Image.naturalHeight;
            var listener = this._Listener;
            if (listener) {
                listener.OnImageLoaded(this, e);
                listener.ImageChanged(this);
            }
        }
    }
    Fayde.CoreLibrary.add(BitmapSource);
}