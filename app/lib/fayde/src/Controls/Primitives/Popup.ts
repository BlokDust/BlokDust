/// <reference path="../../Core/FrameworkElement.ts" />

module Fayde.Controls.Primitives {
    import PopupUpdater = minerva.controls.popup.PopupUpdater;

    export class PopupNode extends FENode {
        LayoutUpdater: PopupUpdater;
        XObject: Popup;

        ClickedOutside = new nullstone.Event<nullstone.IEventArgs>();

        OnIsAttachedChanged (newIsAttached: boolean) {
            super.OnIsAttachedChanged(newIsAttached);
            this.RegisterInitiator(this.VisualParentNode.XObject);
            if (!newIsAttached && this.XObject.IsOpen)
                this.XObject.IsOpen = false;
        }

        private _Overlay: Canvas = null;
        private _Catcher: Canvas = null;

        EnsureOverlay (): Canvas {
            if (!this._Overlay) {
                this._Overlay = new Canvas();
                this.LayoutUpdater.setLayer(this._Overlay.XamlNode.LayoutUpdater);
            }
            return this._Overlay;
        }

        EnsureCatcher (): Canvas {
            var catcher = this._Catcher;
            if (this.ClickedOutside.has && !catcher) {
                catcher = this._Catcher = new Canvas();
                catcher.Background = Media.SolidColorBrush.FromColor(Color.FromRgba(255, 255, 255, 0));
                catcher.LayoutUpdated.on(this.UpdateCatcher, this);
                catcher.MouseLeftButtonDown.on(this._RaiseClickedOutside, this);
                this.EnsureOverlay().Children.Insert(0, catcher);
            }
            return catcher;
        }

        UpdateCatcher () {
            var root = this._Overlay;
            if (!root)
                return;
            var surface = this.LayoutUpdater.tree.initiatorSurface;
            if (!surface)
                return;
            root.Width = surface.width;
            root.Height = surface.height;
            var catcher = this._Catcher;
            if (!catcher)
                return;
            catcher.Width = root.Width;
            catcher.Height = root.Height;
        }

        private _RaiseClickedOutside (sender, e) {
            this.ClickedOutside.raise(this, null);
        }

        RegisterInitiator (initiator: UIElement) {
            if (!(initiator instanceof UIElement))
                return;
            this.LayoutUpdater.setInitiator(initiator.XamlNode.LayoutUpdater);
        }
    }

    export class Popup extends FrameworkElement {
        XamlNode: PopupNode;
        CreateNode (): PopupNode { return new PopupNode(this); }
        CreateLayoutUpdater () { return new PopupUpdater(); }

        static ChildProperty = DependencyProperty.Register("Child", () => UIElement, Popup);
        static HorizontalOffsetProperty = DependencyProperty.Register("HorizontalOffset", () => Number, Popup, 0.0);
        static VerticalOffsetProperty = DependencyProperty.Register("VerticalOffset", () => Number, Popup, 0.0);
        static IsOpenProperty = DependencyProperty.Register("IsOpen", () => Boolean, Popup, false);
        Child: UIElement;
        HorizontalOffset: number;
        VerticalOffset: number;
        IsOpen: boolean;

        Opened = new nullstone.Event<nullstone.IEventArgs>();
        Closed = new nullstone.Event<nullstone.IEventArgs>();

        WatchOutsideClick (callback: () => void, closure: any) {
            this.XamlNode.ClickedOutside.on(callback, closure);
            this.XamlNode.EnsureCatcher();
        }
    }
    Fayde.CoreLibrary.add(Popup);
    Markup.Content(Popup, Popup.ChildProperty);

    module reactions {
        UIReaction<boolean>(Popup.IsOpenProperty, (upd, ov, nv, popup?: Popup) => {
            if (nv === true) {
                popup.Opened.raiseAsync(popup, null);
                popup.XamlNode.UpdateCatcher();
            } else {
                popup.Closed.raiseAsync(popup, null);
            }
            minerva.controls.popup.reactTo.isOpen(upd, ov, nv);
        }, false);
        UIReaction<UIElement>(Popup.ChildProperty, (upd, ov, nv, popup?: Popup) => {
            var overlay = popup.XamlNode.EnsureOverlay();
            if (ov) {
                Providers.InheritedStore.ClearInheritedOnRemove(popup, ov.XamlNode);
                overlay.Children.Remove(ov);
            }
            upd.setChild(nv ? nv.XamlNode.LayoutUpdater : null);
            if (nv) {
                popup.XamlNode.EnsureCatcher();
                overlay.Children.Add(nv);
                Providers.InheritedStore.PropagateInheritedOnAdd(popup, nv.XamlNode);
            }
        }, false, false);
        UIReaction<number>(Popup.HorizontalOffsetProperty, minerva.controls.popup.reactTo.horizontalOffset, false);
        UIReaction<number>(Popup.VerticalOffsetProperty, minerva.controls.popup.reactTo.verticalOffset, false);
    }
}