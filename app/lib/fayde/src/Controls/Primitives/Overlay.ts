/// <reference path="../../Core/FrameworkElement" />

module Fayde.Controls.Primitives {
    import OverlayUpdater = minerva.controls.overlay.OverlayUpdater;
    var DEFAULT_MASK_BRUSH = "#33000000";

    export class OverlayNode extends FENode {
        LayoutUpdater: OverlayUpdater;
        XObject: Overlay;

        private _Layer: Panel = null;
        private _Mask: Border = null;

        EnsureLayer () {
            if (!this._Layer) {
                this._Layer = new Panel();
                this.LayoutUpdater.setLayer(this._Layer.XamlNode.LayoutUpdater);
            }
            return this._Layer;
        }

        EnsureMask () {
            if (!this._Mask) {
                this._Mask = new Border();
                this._Mask.MouseLeftButtonDown.on(this._OnMaskMouseDown, this);
                this.UpdateMask();
            }
            return this._Mask;
        }

        private _OnMaskMouseDown (sender, args: Input.MouseButtonEventArgs) {
            this.XObject.SetCurrentValue(Overlay.IsOpenProperty, false);
        }

        UpdateMask () {
            var mask = this._Mask;
            if (mask) {
                var mb = this.XObject.MaskBrush;
                if (mb === undefined)
                    mb = nullstone.convertAnyToType(DEFAULT_MASK_BRUSH, Media.Brush);
                this._Mask.Background = mb;
            }
        }

        OnIsAttachedChanged (newIsAttached: boolean) {
            super.OnIsAttachedChanged(newIsAttached);
            this.RegisterInitiator(this.VisualParentNode.XObject);
            if (newIsAttached) {
                this.EnsureLayer().Children.Insert(0, this.EnsureMask());
            }
            if (!newIsAttached && this.XObject.IsOpen)
                this.XObject.IsOpen = false;
        }

        RegisterInitiator (initiator: UIElement) {
            if (!(initiator instanceof UIElement))
                return;
            this.LayoutUpdater.setInitiator(initiator.XamlNode.LayoutUpdater);
        }
    }

    export class Overlay extends FrameworkElement {
        XamlNode: OverlayNode;

        CreateNode (): OverlayNode {
            return new OverlayNode(this);
        }

        CreateLayoutUpdater (): OverlayUpdater {
            return new OverlayUpdater();
        }

        static VisualProperty = DependencyProperty.Register("Visual", () => UIElement, Overlay, undefined, (d: Overlay, args) => d._OnVisualChanged(args));
        static VisualUriProperty = DependencyProperty.Register("VisualUri", () => Uri, Overlay, undefined, (d: Overlay, args) => d._OnVisualUriChanged(args));
        static VisualViewModelProperty = DependencyProperty.Register("VisualViewModel", () => Object, Overlay, undefined, (d: Overlay, args) => d._OnVisualViewModelChanged(args));
        static IsOpenProperty = DependencyProperty.Register("IsOpen", () => Boolean, Overlay, undefined, (d: Overlay, args) => d._OnIsOpenChanged(args));
        static MaskBrushProperty = DependencyProperty.Register("MaskBrush", () => Media.Brush, Overlay);
        static ClosedCommandProperty = DependencyProperty.Register("ClosedCommand", () => Input.ICommand_, Overlay);
        Visual: UIElement;
        VisualUri: Uri;
        VisualViewModel: any;
        IsOpen: boolean;
        MaskBrush: Media.Brush;
        ClosedCommand: Input.ICommand;

        Opened = new nullstone.Event<nullstone.IEventArgs>();
        Closed = new nullstone.Event<OverlayClosedEventArgs>();

        constructor () {
            super();
            this.DefaultStyleKey = Overlay;
            this.InitBindings();
        }

        InitBindings () {
            this.SetBinding(Overlay.VisualViewModelProperty, new Data.Binding("OverlayDataContext"));
            var binding = new Data.Binding("IsOpen");
            binding.Mode = Data.BindingMode.TwoWay;
            this.SetBinding(Overlay.IsOpenProperty, binding);
            this.SetBinding(Overlay.ClosedCommandProperty, new Data.Binding("ClosedCommand"));
        }

        private _ContentControlForUri: ContentControl = null;
        private _IgnoreClose = false;

        private _OnVisualChanged (args: IDependencyPropertyChangedEventArgs) {
            if (this.VisualUri != null)
                throw new Error("Cannot set Visual if VisualUri is set.");
            var layer = this.XamlNode.EnsureLayer();
            if (args.OldValue)
                layer.Children.Remove(args.OldValue);
            if (args.NewValue)
                layer.Children.Add(args.NewValue);
        }

        private _OnVisualUriChanged (args: IDependencyPropertyChangedEventArgs) {
            if (this.Visual != null)
                throw new Error("Cannot set VisualUri if Visual is set.");
            if (args.NewValue)
                this._SetVisualUri(args.NewValue);
            else
                this._ClearVisualUri();
        }

        private _OnVisualViewModelChanged (args: IDependencyPropertyChangedEventArgs) {
            var cc: ContentControl;
            var visual: UIElement;
            if (!!(cc = this._ContentControlForUri))
                cc.DataContext = args.NewValue;
            else if (!!(visual = this.Visual))
                visual.DataContext = args.NewValue;
        }

        private _SetVisualUri (uri: Uri) {
            var cc = this._ContentControlForUri;
            if (!cc) {
                var layer = this.XamlNode.EnsureLayer();
                cc = this._ContentControlForUri = new ContentControl();
                cc.SetValue(OverlayOwnerProperty, this);
                layer.Children.Add(cc);
            }
            cc.ContentUri = uri;
            var vm = this.VisualViewModel;
            if (vm !== undefined)
                cc.DataContext = vm;
        }

        private _ClearVisualUri () {
            var cc = this._ContentControlForUri;
            if (!cc)
                return;
            var layer = this.XamlNode.EnsureLayer();
            layer.Children.Remove(cc);
            cc.ContentUri = null;
            cc.DataContext = undefined;
        }

        private _OnIsOpenChanged (args: IDependencyPropertyChangedEventArgs) {
            var ov = args.OldValue || false;
            var nv = args.NewValue || false;
            if (ov === nv)
                return;
            if (nv === true) {
                this._DoOpen();
            } else {
                this._DoClose();
            }
        }

        private _DoOpen () {
            var upd = this.XamlNode.LayoutUpdater;
            minerva.controls.overlay.reactTo.isOpen(upd, false, true);
            this.Opened.raise(this, null);
        }

        private _DoClose (result?: boolean) {
            var upd = this.XamlNode.LayoutUpdater;
            minerva.controls.overlay.reactTo.isOpen(upd, true, false);
            if (result === undefined)
                result = this._GetDialogResult();
            var parameter: MVVM.IOverlayCompleteParameters = {
                Result: result,
                Data: this.VisualViewModel
            };
            var cmd = this.ClosedCommand;
            if (cmd && (!cmd.CanExecute || cmd.CanExecute(parameter)))
                cmd.Execute(parameter);
            this.Closed.raise(this, new OverlayClosedEventArgs(parameter.Result, parameter.Data));
        }

        Open () {
            this.IsOpen = true;
        }

        Close (result?: boolean) {
            if (this.IsOpen !== true)
                return;
            this._IgnoreClose = true;
            try {
                this.SetCurrentValue(Overlay.IsOpenProperty, false);
            } finally {
                this._IgnoreClose = false;
            }
            this._DoClose(result);
        }

        private _GetDialogResult (): boolean {
            var visual = this.Visual || this._ContentControlForUri;
            if (!visual)
                return undefined;
            var dialog = VisualTreeHelper.GetChildrenCount(visual) > 0 ? VisualTreeHelper.GetChild(visual, 0) : null;
            return (dialog instanceof Dialog) ? (<Dialog>dialog).DialogResult : null;
        }

        static FindOverlay (visual: UIElement): Overlay {
            for (var en = VisualTreeEnum.GetAncestors(visual).getEnumerator(); en.moveNext();) {
                var owner = en.current.GetValue(OverlayOwnerProperty);
                if (owner instanceof Overlay)
                    return owner;
            }
            return undefined;
        }
    }
    Fayde.CoreLibrary.add(Overlay);
    Markup.Content(Overlay, Overlay.VisualProperty);

    module reactions {
        DPReaction<Media.Brush>(Overlay.MaskBrushProperty, (overlay: Overlay, ov, nv) => {
            overlay.XamlNode.UpdateMask();
        });
    }

    var OverlayOwnerProperty = DependencyProperty.RegisterAttached("OverlayOwner", () => Overlay, Overlay);
}