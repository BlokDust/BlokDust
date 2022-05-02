/// <reference path="../Core/DependencyObject.ts" />
/// <reference path="../Primitives/Point.ts" />

module Fayde.Controls {
    var AssignedToolTipProperty = DependencyProperty.Register("AssignedToolTip", () => ToolTip, UIElement, null);
    
    var betweenShowDelay = 100;
    var initialShowDelay = 400;
    var showDuration = 5000;

    function toolTipChanged(dobj: DependencyObject, args: DependencyPropertyChangedEventArgs) {
        var owner = <UIElement>dobj;
        var tooltip = args.NewValue;

        if (args.OldValue)
            slave.UnregisterTooltip(owner);

        if (!tooltip)
            return;

        slave.RegisterTooltip(owner, tooltip);
        slave.SetRootVisual(owner);
    }
    export class ToolTipService {
        static ToolTipProperty = DependencyProperty.RegisterAttached("ToolTip", () => DependencyObject, ToolTipService, undefined, toolTipChanged);
        static GetToolTip(dobj: DependencyObject): ToolTip { return dobj.GetValue(ToolTipService.ToolTipProperty); }
        static SetToolTip(dobj: DependencyObject, value: ToolTip) { dobj.SetValue(ToolTipService.ToolTipProperty, value); }

        static PlacementProperty = DependencyProperty.RegisterAttached("Placement", () => new Enum(PlacementMode), ToolTipService);
        static GetPlacement(dobj: DependencyObject): PlacementMode { return dobj.GetValue(ToolTipService.PlacementProperty); }
        static SetPlacement(dobj: DependencyObject, value: PlacementMode) { dobj.SetValue(ToolTipService.PlacementProperty, value); }

        static PlacementTargetProperty = DependencyProperty.RegisterAttached("PlacementTarget", () => UIElement, ToolTipService);
        static GetPlacementTarget(dobj: DependencyObject): UIElement { return dobj.GetValue(ToolTipService.PlacementTargetProperty); }
        static SetPlacementTarget(dobj: DependencyObject, value: UIElement) { dobj.SetValue(ToolTipService.PlacementTargetProperty, value); }

        static get MousePosition(): Point {
            return slave.MousePosition;
        }
    }
    Fayde.CoreLibrary.add(ToolTipService);


    class ToolTipServiceSlave {
        MousePosition: Point = new Point();
        private _RootVisual: FrameworkElement = null;
        private _CurrentTooltip: ToolTip = null;
        private _LastEnterSource: any = null;
        private _Owner: UIElement;
        private _LastOpened: number = 0;
        private _OpenInterval: number = null;
        private _CloseInterval: number = null;

        SetRootVisual(owner: UIElement) {
            if (this._RootVisual)
                return;
            var updater = owner.XamlNode.LayoutUpdater;
            var surface = <Surface>updater.tree.surface;
            if (!surface)
                return;
            var rv = this._RootVisual = <FrameworkElement>surface.App.RootVisual;
            if (!rv)
                return;
            // keep caching mouse position because we can't query it from Silverlight 
            rv.MouseMove.on(this.OnRootMouseMove, this);
        }
        private OnRootMouseMove(sender: any, e: Input.MouseEventArgs) {
            this.MousePosition = e.GetPosition(null);
        }

        RegisterTooltip(owner: UIElement, tooltip: any) {
            console.assert(owner != null, "ToolTip must have an owner");
            console.assert(tooltip != null, "ToolTip can not be null");

            owner.MouseEnter.on(this.OnOwnerMouseEnter, this);
            owner.MouseLeave.on(this.OnOwnerMouseLeave, this);
            owner.MouseLeftButtonDown.on(this.OnOwnerMouseLeftButtonDown, this);
            owner.KeyDown.on(this.OnOwnerKeyDown, this);
            var converted = this.ConvertToToolTip(tooltip);
            owner.SetValue(AssignedToolTipProperty, converted);
            if (owner instanceof FrameworkElement)
                converted.TooltipParent = <FrameworkElement>owner;
        }
        UnregisterTooltip(owner: UIElement) {
            console.assert(owner != null, "owner element is required");

            var tooltip: ToolTip = owner.GetValue(AssignedToolTipProperty);
            if (!tooltip || !(tooltip instanceof ToolTip))
                return;

            owner.MouseEnter.off(this.OnOwnerMouseEnter, this);
            owner.MouseLeave.off(this.OnOwnerMouseLeave, this);
            owner.MouseLeftButtonDown.off(this.OnOwnerMouseLeftButtonDown, this);
            owner.KeyDown.off(this.OnOwnerKeyDown, this);

            tooltip.TooltipParent = null;
            if (tooltip.IsOpen) {
                if (tooltip === this._CurrentTooltip) {
                    window.clearInterval(this._CloseInterval);
                    this._CurrentTooltip = null;
                    this._Owner = null;
                    this._LastEnterSource = null;
                }

                tooltip.IsOpen = false;
            }

            owner.ClearValue(AssignedToolTipProperty);
        }

        private OnOwnerMouseEnter(sender: any, e: Input.MouseEventArgs) {
            this.MousePosition = e.GetPosition(null);
            this.OnOwnerMouseEnterInternal(sender, e.OriginalSource);
        }
        private OnOwnerMouseLeave(sender: any, e: Input.MouseEventArgs) {
            if (!this._CurrentTooltip) {
                window.clearInterval(this._OpenInterval);
                this._Owner = null;
                this._LastEnterSource = null;
                return;
            }
            this.CloseAutomaticToolTip();
        }
        private OnOwnerMouseLeftButtonDown(sender: any, e: Input.MouseButtonEventArgs) {
            if (this._LastEnterSource && this._LastEnterSource === e.OriginalSource)
                return;
            if (this._Owner !== sender)
                return;

            if (!this._CurrentTooltip) {
                window.clearInterval(this._OpenInterval);
                this._Owner = null;
                this._LastEnterSource = null;
                return;
            }

            this.CloseAutomaticToolTip();
        }
        private OnOwnerKeyDown(sender: any, e: Input.KeyEventArgs) {
            if (this._LastEnterSource && this._LastEnterSource === e.OriginalSource)
                return;
            if (this._Owner !== sender)
                return;

            if (!this._CurrentTooltip) {
                window.clearInterval(this._OpenInterval);
                this._Owner = null;
                this._LastEnterSource = null;
                return;
            }

            if (isSpecialKey(e.Key))
                return;

            this.CloseAutomaticToolTip();
        }
        private OnOwnerMouseEnterInternal(sender: any, source: any) {
            if (this._LastEnterSource && this._LastEnterSource === source)
                return;

            if (this._CurrentTooltip) {
                if (sender.GetValue(AssignedToolTipProperty) === this._CurrentTooltip)
                    return;
                this.CloseAutomaticToolTip();
            }

            this._Owner = sender;
            this._LastEnterSource = source;

            console.assert(!this._CurrentTooltip);

            this.SetRootVisual(sender);

            var sinceLastOpen = new Date().getTime() - this._LastOpened;
            if (sinceLastOpen <= betweenShowDelay) {
                this.OpenAutomaticToolTip();
            } else {
                this._OpenInterval = window.setInterval(() => this.OpenAutomaticToolTip(), initialShowDelay);
            }
        }

        private ConvertToToolTip(o: any): ToolTip {
            if (o instanceof ToolTip)
                return o;

            if (o instanceof FrameworkElement) {
                var parent = (<FrameworkElement> o).Parent;
                if (parent instanceof ToolTip)
                    return <ToolTip>parent;
            }

            var tooltip = new ToolTip();
            tooltip.Content = o;
            return tooltip;
        }

        private OpenAutomaticToolTip() {
            window.clearInterval(this._OpenInterval);

            console.assert(this._Owner != null, "ToolTip owner was not set prior to starting the open timer");

            var cur = this._CurrentTooltip = <ToolTip> this._Owner.GetValue(AssignedToolTipProperty);

            if (cur != null) {
                cur.PlacementOverride = ToolTipService.GetPlacement(this._Owner);
                cur.PlacementTargetOverride = ToolTipService.GetPlacementTarget(this._Owner) || this._Owner;
                cur.IsOpen = true;

                this._CloseInterval = window.setInterval(() => this.CloseAutomaticToolTip(), showDuration);
            }
        }
        private CloseAutomaticToolTip() {
                window.clearInterval(this._CloseInterval);

            var cur = this._CurrentTooltip;
            cur.PlacementOverride = null;
            cur.PlacementTargetOverride = null;
            cur.IsOpen = false;
            this._CurrentTooltip = null;

            this._Owner = null;
            this._LastEnterSource = null;

            this._LastOpened = new Date().getTime();
        }
    }
    var slave = new ToolTipServiceSlave();

    var specialKeys: Input.Key[] =
        [
            Input.Key.Alt,
            Input.Key.Back,
            Input.Key.Delete,
            Input.Key.Down,
            Input.Key.End,
            Input.Key.Home,
            Input.Key.Insert,
            Input.Key.Left,
            Input.Key.PageDown,
            Input.Key.PageUp,
            Input.Key.Right,
            Input.Key.Space,
            Input.Key.Up
        ];
    function isSpecialKey(key: Input.Key): boolean {
        return specialKeys.indexOf(key) > -1;
    }
}