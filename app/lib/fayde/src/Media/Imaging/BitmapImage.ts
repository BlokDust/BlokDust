/// <reference path="BitmapSource.ts"/>

module Fayde.Media.Imaging {
    export class BitmapImage extends BitmapSource {
        static UriSourceProperty = DependencyProperty.RegisterFull("UriSource", () => Uri, BitmapImage, undefined, (bi: BitmapImage, args) => bi._UriSourceChanged(args), undefined, true);
        UriSource: Uri;
        ImageFailed = new nullstone.Event();
        ImageOpened = new nullstone.Event();

        private _BackingBuffer: ArrayBuffer = null;

        constructor (uri?: Uri) {
            super();
            if (uri)
                this.UriSource = uri;
        }

        private _UriSourceChanged (args: IDependencyPropertyChangedEventArgs) {
            var uri: Uri = args.NewValue;
            if (Uri.isNullOrEmpty(uri))
                this.ResetImage();
            else
                this.UriSourceChanged(args.OldValue, uri);
        }

        _OnErrored (e: Event) {
            super._OnErrored(e);
            this.ImageFailed.raise(this, null);
        }

        _OnLoad (e: Event) {
            super._OnLoad(e);
            this.ImageOpened.raise(this, null);
        }

        SetSource (buffer: ArrayBuffer) {
            this._BackingBuffer = buffer;
            this.UriSource = encodeImage(buffer);
        }
    }
    Fayde.CoreLibrary.add(BitmapImage);

    nullstone.registerTypeConverter(ImageSource, (val: any): ImageSource => {
        if (!val)
            return null;
        if (val instanceof ImageSource)
            return val;
        if (val instanceof ArrayBuffer) {
            var bi = new BitmapImage();
            bi.SetSource(val);
            return bi;
        }
        var bi = new BitmapImage();
        bi.UriSource = nullstone.convertAnyToType(val, Uri);
        return bi;
    });
}