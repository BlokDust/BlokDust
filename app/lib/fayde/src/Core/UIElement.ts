/// <reference path="DependencyObject.ts" />
/// <reference path="UIReaction.ts" />
/// <reference path="UIReactionAttached.ts" />
/// <reference path="Providers/InheritedStore.ts" />
/// <reference path="Enums.ts" />
/// <reference path="InheritableOwner.ts" />

module Fayde {
    export class UINode extends DONode {
        XObject: UIElement;
        LayoutUpdater: minerva.core.Updater;
        IsMouseOver: boolean = false;

        constructor(xobj: UIElement) {
            super(xobj);
            var upd = this.LayoutUpdater = xobj.CreateLayoutUpdater();
            upd.setAttachedValue("$node", this);
            upd.setAttachedValue("$id", (<any>this.XObject)._ID);
        }

        VisualParentNode: UINode;
        GetVisualRoot(): UINode {
            var curNode = this;
            var vpNode: UINode;
            while (vpNode = curNode.VisualParentNode) {
                curNode = vpNode;
            }
            return curNode;
        }

        IsLoaded: boolean = false;
        SetIsLoaded(value: boolean) { }

        OnVisualChildAttached(uie: UIElement) {
            var un = uie.XamlNode;
            Providers.InheritedStore.PropagateInheritedOnAdd(this.XObject, un);
            un.SetVisualParentNode(this);
        }
        OnVisualChildDetached(uie: UIElement) {
            var un = uie.XamlNode;
            un.SetVisualParentNode(null);
            Providers.InheritedStore.ClearInheritedOnRemove(this.XObject, un);
        }

        private SetVisualParentNode(visualParentNode: UINode) {
            if (this.VisualParentNode === visualParentNode)
                return;
            this.VisualParentNode = visualParentNode;
            this.LayoutUpdater.setVisualParent(visualParentNode ? visualParentNode.LayoutUpdater : null);
        }

        Focus(recurse?: boolean): boolean { return false; }

        _EmitFocusChange(type: string) {
            if (type === "got")
                this._EmitGotFocus();
            else if (type === "lost")
                this._EmitLostFocus();
        }
        private _EmitLostFocus() {
            var e = new Fayde.RoutedEventArgs();
            var x = this.XObject;
            x.OnLostFocus(e);
            x.LostFocus.raise(x, e);
        }
        private _EmitGotFocus() {
            var e = new Fayde.RoutedEventArgs();
            var x = this.XObject;
            x.OnGotFocus(e);
            x.GotFocus.raise(x, e);
        }
        _EmitKeyDown(args: Fayde.Input.KeyEventArgs) {
            var x = this.XObject;
            x.OnKeyDown(args);
            x.KeyDown.raise(x, args);
        }
        _EmitKeyUp(args: Fayde.Input.KeyEventArgs) {
            var x = this.XObject;
            x.OnKeyUp(args);
            x.KeyUp.raise(x, args);
        }
        _EmitLostMouseCapture(pos: Point) {
            var x = this.XObject;
            var e = new Input.MouseEventArgs(pos);
            x.OnLostMouseCapture(e);
            x.LostMouseCapture.raise(x, e);
        }
        _EmitMouseEvent(type: Input.MouseInputType, isLeftButton: boolean, isRightButton: boolean, args: Input.MouseEventArgs): boolean {
            var x = this.XObject;
            switch (type) {
                case Input.MouseInputType.MouseUp:
                    if (isLeftButton) {
                        x.OnMouseLeftButtonUp(<Input.MouseButtonEventArgs>args);
                        x.MouseLeftButtonUp.raise(x, args);
                    } else if (isRightButton) {
                        x.OnMouseRightButtonUp(<Input.MouseButtonEventArgs>args);
                        x.MouseRightButtonUp.raise(x, args);
                    }
                    break;
                case Input.MouseInputType.MouseDown:
                    if (isLeftButton) {
                        x.OnMouseLeftButtonDown(<Input.MouseButtonEventArgs>args);
                        x.MouseLeftButtonDown.raise(x, args);
                    } else if (isRightButton) {
                        x.OnMouseRightButtonDown(<Input.MouseButtonEventArgs>args);
                        x.MouseRightButtonDown.raise(x, args);
                    }
                    break;
                case Input.MouseInputType.MouseLeave:
                    this.IsMouseOver = false;
                    x.OnMouseLeave(args);
                    x.MouseLeave.raise(x, args);
                    break;
                case Input.MouseInputType.MouseEnter:
                    this.IsMouseOver = true;
                    x.OnMouseEnter(args);
                    x.MouseEnter.raise(x, args);
                    break;
                case Input.MouseInputType.MouseMove:
                    x.OnMouseMove(args);
                    x.MouseMove.raise(x, args);
                    break;
                case Input.MouseInputType.MouseWheel:
                    x.OnMouseWheel(<Input.MouseWheelEventArgs>args);
                    x.MouseWheel.raise(x, <Input.MouseWheelEventArgs>args);
                    break;
                default:
                    return false;
            }
            return args.Handled;
        }
        _EmitTouchEvent(type: Input.TouchInputType, args: Input.TouchEventArgs) {
            var x = this.XObject;
            switch (type) {
                case Input.TouchInputType.TouchDown:
                    x.OnTouchDown(args);
                    x.TouchDown.raise(x, args);
                    break;
                case Input.TouchInputType.TouchUp:
                    x.OnTouchUp(args);
                    x.TouchUp.raise(x, args);
                    break;
                case Input.TouchInputType.TouchMove:
                    x.OnTouchMove(args);
                    x.TouchMove.raise(x, args);
                    break;
                case Input.TouchInputType.TouchEnter:
                    x.OnTouchEnter(args);
                    x.TouchEnter.raise(x, args);
                    break;
                case Input.TouchInputType.TouchLeave:
                    x.OnTouchLeave(args);
                    x.TouchLeave.raise(x, args);
                    break;
                default:
                    return false;
            }
            return args.Handled;
        }
        _EmitGotTouchCapture(e: Input.TouchEventArgs) {
            var x = this.XObject;
            x.OnGotTouchCapture(e);
            x.GotTouchCapture.raise(this, e);
        }
        _EmitLostTouchCapture(e: Input.TouchEventArgs) {
            var x = this.XObject;
            x.OnLostTouchCapture(e);
            x.LostTouchCapture.raise(this, e);
        }

        CanCaptureMouse(): boolean { return true; }
        CaptureMouse(): boolean {
            if (!this.IsAttached)
                return false;
            Surface.SetMouseCapture(this);
            return true;
        }
        ReleaseMouseCapture() {
            if (!this.IsAttached)
                return;
            Surface.ReleaseMouseCapture(this);
        }

        IsAncestorOf(uin: UINode) {
            var vpNode = uin;
            while (vpNode && vpNode !== this)
                vpNode = vpNode.VisualParentNode;
            return vpNode === this;
        }

        TransformToVisual (uin?: UINode): Media.GeneralTransform {
            var raw = minerva.core.Updater.transformToVisual(this.LayoutUpdater, uin ? uin.LayoutUpdater : null);
            if (!raw)
                throw new ArgumentException("UIElement not attached.");
            var mt = new Media.MatrixTransform();
            mt.SetCurrentValue(Media.MatrixTransform.MatrixProperty, new Media.Matrix(raw));
            return mt;
        }
    }

    export class UIElement extends DependencyObject implements Providers.IIsPropertyInheritable {
        XamlNode: UINode;
        CreateNode(): UINode { return new UINode(this); }
        CreateLayoutUpdater(): minerva.core.Updater { return new minerva.core.Updater(); }

        get IsItemsControl(): boolean { return false; }

        get VisualParent() {
            var vpNode = this.XamlNode.VisualParentNode;
            if (vpNode) return vpNode.XObject;
            return undefined;
        }

        static AllowDropProperty: DependencyProperty;
        static CacheModeProperty: DependencyProperty;
        static ClipProperty = DependencyProperty.RegisterCore("Clip", () => Media.Geometry, UIElement);
        static EffectProperty = DependencyProperty.Register("Effect", () => Media.Effects.Effect, UIElement);
        static IsHitTestVisibleProperty = DependencyProperty.RegisterCore("IsHitTestVisible", () => Boolean, UIElement, true);
        static OpacityMaskProperty = DependencyProperty.RegisterCore("OpacityMask", () => Media.Brush, UIElement);
        static OpacityProperty = DependencyProperty.RegisterCore("Opacity", () => Number, UIElement, 1.0);
        static RenderTransformProperty = DependencyProperty.RegisterCore("RenderTransform", () => Media.Transform, UIElement);
        static RenderTransformOriginProperty = DependencyProperty.Register("RenderTransformOrigin", () => Point, UIElement);
        static TagProperty = DependencyProperty.Register("Tag", () => Object, UIElement);
        static TriggersProperty: DependencyProperty = DependencyProperty.RegisterCore("Triggers", () => TriggerCollection, UIElement, undefined, (d, args) => (<UIElement>d)._TriggersChanged(args));
        static UseLayoutRoundingProperty = InheritableOwner.UseLayoutRoundingProperty.ExtendTo(UIElement);
        static VisibilityProperty = DependencyProperty.RegisterCore("Visibility", () => new Enum(Visibility), UIElement, Visibility.Visible);

        IsInheritable(propd: DependencyProperty): boolean {
            return propd === UIElement.UseLayoutRoundingProperty;
        }

        get IsMouseOver() { return this.XamlNode.IsMouseOver; }
        get DesiredSize(): minerva.Size {
            var ds = this.XamlNode.LayoutUpdater.assets.desiredSize;
            return new minerva.Size(ds.width, ds.height);
        }
        get RenderSize(): minerva.Size {
            var ds = this.XamlNode.LayoutUpdater.assets.renderSize;
            return new minerva.Size(ds.width, ds.height);
        }

        //AllowDrop: boolean;
        //CacheMode;
        Clip: Media.Geometry;
        Effect: Media.Effects.Effect;
        IsHitTestVisible: boolean;
        Cursor: CursorType;
        OpacityMask: Media.Brush;
        Opacity: number;
        //Projection: Media.Projection;
        RenderTransform: Media.Transform;
        RenderTransformOrigin: Point;
        Tag: any;
        Triggers: TriggerCollection;
        UseLayoutRounding: boolean;
        Visibility: Visibility;

        Focus(): boolean { return this.XamlNode.Focus(); }
        CaptureMouse():boolean { return this.XamlNode.CaptureMouse(); }
        ReleaseMouseCapture() { this.XamlNode.ReleaseMouseCapture(); }

        IsAncestorOf(uie: UIElement): boolean {
            if (!uie) return false;
            return this.XamlNode.IsAncestorOf(uie.XamlNode);
        }
        TransformToVisual(uie: UIElement): Media.GeneralTransform {
            var uin = (uie) ? uie.XamlNode : null;
            return this.XamlNode.TransformToVisual(uin);
        }

        InvalidateMeasure() { this.XamlNode.LayoutUpdater.invalidateMeasure(); }
        Measure(availableSize: minerva.Size) {
            this.XamlNode.LayoutUpdater.measure(availableSize);
        }
        InvalidateArrange() { this.XamlNode.LayoutUpdater.invalidateArrange(); }
        Arrange(finalRect: minerva.Rect) {
            this.XamlNode.LayoutUpdater.arrange(finalRect);
        }

        LostFocus = new RoutedEvent<RoutedEventArgs>();
        GotFocus = new RoutedEvent<RoutedEventArgs>();
        LostMouseCapture = new RoutedEvent<Input.MouseEventArgs>();
        KeyDown = new RoutedEvent<Input.KeyEventArgs>();
        KeyUp = new RoutedEvent<Input.KeyEventArgs>();
        MouseLeftButtonUp = new RoutedEvent<Input.MouseButtonEventArgs>();
        MouseRightButtonUp = new RoutedEvent<Input.MouseButtonEventArgs>();
        MouseLeftButtonDown = new RoutedEvent<Input.MouseButtonEventArgs>();
        MouseRightButtonDown = new RoutedEvent<Input.MouseButtonEventArgs>();
        MouseLeave = new RoutedEvent<Input.MouseEventArgs>();
        MouseEnter = new RoutedEvent<Input.MouseEventArgs>();
        MouseMove = new RoutedEvent<Input.MouseEventArgs>();
        MouseWheel = new RoutedEvent<Input.MouseWheelEventArgs>();
        TouchDown = new RoutedEvent<Input.TouchEventArgs>();
        TouchUp = new RoutedEvent<Input.TouchEventArgs>();
        TouchEnter = new RoutedEvent<Input.TouchEventArgs>();
        TouchLeave = new RoutedEvent<Input.TouchEventArgs>();
        TouchMove = new RoutedEvent<Input.TouchEventArgs>();
        GotTouchCapture = new RoutedEvent<Input.TouchEventArgs>();
        LostTouchCapture = new RoutedEvent<Input.TouchEventArgs>();

        OnGotFocus(e: RoutedEventArgs) { }
        OnLostFocus(e: RoutedEventArgs) { }
        OnLostMouseCapture(e: Input.MouseEventArgs) { }
        OnKeyDown(e: Input.KeyEventArgs) { }
        OnKeyUp(e: Input.KeyEventArgs) { }
        OnMouseEnter(e: Input.MouseEventArgs) { }
        OnMouseLeave(e: Input.MouseEventArgs) { }
        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) { }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) { }
        OnMouseMove(e: Input.MouseEventArgs) { }
        OnMouseRightButtonDown(e: Input.MouseButtonEventArgs) { }
        OnMouseRightButtonUp(e: Input.MouseButtonEventArgs) { }
        OnMouseWheel(e: Input.MouseWheelEventArgs) { }
        OnTouchDown(e: Input.TouchEventArgs) { }
        OnTouchUp(e: Input.TouchEventArgs) { }
        OnTouchEnter(e: Input.TouchEventArgs) { }
        OnTouchLeave(e: Input.TouchEventArgs) { }
        OnTouchMove(e: Input.TouchEventArgs) { }
        OnGotTouchCapture(e: Input.TouchEventArgs) { }
        OnLostTouchCapture(e: Input.TouchEventArgs) { }

        private _TriggersChanged(args: IDependencyPropertyChangedEventArgs) {
            var oldTriggers = <TriggerCollection>args.OldValue;
            var newTriggers = <TriggerCollection>args.NewValue;
            if (oldTriggers instanceof TriggerCollection)
                oldTriggers.DetachTarget(this);
            if (newTriggers instanceof TriggerCollection)
                newTriggers.AttachTarget(this);
        }
    }
    Fayde.CoreLibrary.add(UIElement);

    module reactions {
        UIReaction<minerva.IGeometry>(UIElement.ClipProperty, minerva.core.reactTo.clip);
        UIReaction<minerva.IEffect>(UIElement.EffectProperty, minerva.core.reactTo.effect);
        UIReaction<boolean>(UIElement.IsHitTestVisibleProperty, minerva.core.reactTo.isHitTestVisible, false);
        UIReaction<number>(UIElement.OpacityProperty, minerva.core.reactTo.opacity, false);
        UIReaction<Media.Transform>(UIElement.RenderTransformProperty, minerva.core.reactTo.renderTransform);
        UIReaction<minerva.Point>(UIElement.RenderTransformOriginProperty, minerva.core.reactTo.renderTransformOrigin, false, minerva.Point.copyTo);
        UIReaction<minerva.Visibility>(UIElement.VisibilityProperty, (upd, ov, nv, uie?) => {
            minerva.core.reactTo.visibility(upd, ov, nv);
            Surface.RemoveFocusFrom(uie);
        }, false);
    }
}