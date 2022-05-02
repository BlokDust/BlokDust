/// <reference path="ContentControl.ts" />

module Fayde.Controls {
    export class ToolTip extends ContentControl {
        static HorizontalOffsetProperty = DependencyProperty.Register("HorizontalOffset", () => Number, ToolTip, 0, (d, args) => (<ToolTip>d).OnHorizontalOffsetChanged(args));
        static VerticalOffsetProperty = DependencyProperty.Register("VerticalOffset", () => Number, ToolTip, 0, (d, args) => (<ToolTip>d).OnVerticalOffsetChanged(args));
        static IsOpenProperty = DependencyProperty.Register("IsOpen", () => Boolean, ToolTip, false, (d, args) => (<ToolTip>d).OnIsOpenChanged(args));
        static PlacementProperty = DependencyProperty.Register("Placement", () => new Enum(PlacementMode), ToolTip, PlacementMode.Mouse);
        static PlacementTargetProperty = DependencyProperty.Register("PlacementTarget", () => UIElement, ToolTip);
        HorizontalOffset: number;
        VerticalOffset: number;
        IsOpen: boolean;
        Placement: PlacementMode;
        PlacementTarget: UIElement;

        private _TooltipParent: FrameworkElement = null;
        private _TooltipParentDCListener: Providers.IPropertyChangedListener = null;
        get TooltipParent(): FrameworkElement { return this._TooltipParent; }
        set TooltipParent(value: FrameworkElement) {
            if (this._TooltipParentDCListener)
                this._TooltipParentDCListener.Detach();
            this._TooltipParent = value;
            if (this._TooltipParent)
                this._TooltipParentDCListener = DependencyObject.DataContextProperty.Store.ListenToChanged(this._TooltipParent, DependencyObject.DataContextProperty, this.OnTooltipParentDataContextChanged, this);
        }
        PlacementOverride: PlacementMode = null;
        PlacementTargetOverride: UIElement = null;

        Opened = new RoutedEvent<RoutedEventArgs>();
        Closed = new RoutedEvent<RoutedEventArgs>();

        private _ParentPopup: Primitives.Popup = null;

        constructor() {
            super();
            this.DefaultStyleKey = ToolTip;
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.UpdateVisualState(false);
        }

        private OnHorizontalOffsetChanged(args: DependencyPropertyChangedEventArgs) {
            if (args.NewValue !== args.OldValue)
                this.OnOffsetChanged(args.NewValue, 0);
        }
        private OnVerticalOffsetChanged(args: DependencyPropertyChangedEventArgs) {
            if (args.NewValue !== args.OldValue)
                this.OnOffsetChanged(0, args.NewValue);
        }
        private OnIsOpenChanged(args: DependencyPropertyChangedEventArgs) {
            if (args.NewValue) {
                if (!this._ParentPopup)
                    this.HookupParentPopup();
                this._ParentPopup.IsOpen = true;
                this.PerformPlacement(this.HorizontalOffset, this.VerticalOffset);
            } else {
                this._ParentPopup.IsOpen = false;
            }
            this.UpdateVisualState();
        }
        private OnOffsetChanged(horizontalOffset: number, verticalOffset: number) {
            if (!this._ParentPopup || !this.IsOpen)
                return;
            this.PerformPlacement(horizontalOffset, verticalOffset);
        }
        private OnLayoutUpdated(sender: any, e: nullstone.IEventArgs) {
            if (this._ParentPopup)
                this.PerformPlacement(this.HorizontalOffset, this.VerticalOffset);
        }
        private OnTooltipParentDataContextChanged(sender: any, args: IDependencyPropertyChangedEventArgs) {
            if (this._ParentPopup && this.TooltipParent)
                this._ParentPopup.DataContext = this.TooltipParent.DataContext;
        }

        private HookupParentPopup() {
            console.assert(!this._ParentPopup, "this._parentPopup should be null, we want to set visual tree once");

            var pp = this._ParentPopup = new Primitives.Popup();
            pp.DataContext = !this.TooltipParent ? null : this.TooltipParent.DataContext;

            pp.Opened.on(this.OnPopupOpened, this);
            pp.Closed.on(this.OnPopupClosed, this);
            this.IsTabStop = false;

            pp.XamlNode.RegisterInitiator(this._TooltipParent);
            pp.Child = this;

            pp.IsHitTestVisible = false;
            this.IsHitTestVisible = false;
        }
        private OnPopupOpened(sender: any, e: nullstone.IEventArgs) {
            var args = new RoutedEventArgs();
            args.OriginalSource = this;
            this.Opened.raise(this, args);
            this.LayoutUpdated.on(this.OnLayoutUpdated, this);
        }
        private OnPopupClosed(sender: any, e: nullstone.IEventArgs) {
            var args = new RoutedEventArgs();
            args.OriginalSource = this;
            this.Closed.raise(this, args);
            this.LayoutUpdated.off(this.OnLayoutUpdated, this);
        }
        private PerformPlacement(horizontalOffset: number, verticalOffset: number) {
            if (!this.IsOpen)
                return;
            var root = <FrameworkElement>Application.Current.RootVisual;
            if (!root)
                return;

            var mode = this.PlacementOverride != null ? this.PlacementOverride : this.Placement;
            var target = <FrameworkElement>(this.PlacementTargetOverride || this.PlacementTarget);
            var targetBounds = new minerva.Rect();

            var point: Point = ToolTipService.MousePosition;
            if (mode !== PlacementMode.Mouse) {
                point = new Point();
                try {
                    if (target != null) {
                        targetBounds = new minerva.Rect(0, 0, target.ActualWidth, target.ActualHeight);
                        targetBounds = target.TransformToVisual(null).TransformBounds(targetBounds);
                        point.x = targetBounds.x;
                        point.y = targetBounds.y;
                    }
                } catch (err) {
                    console.warn("Could not transform the tooltip point.");
                    return;
                }
            }

            //TODO: Handle FlowDirection

            //Move based on PlacementMode
            switch (mode) {
                case PlacementMode.Top:
                    point.y = targetBounds.y - this.ActualHeight;
                    break;
                case PlacementMode.Bottom:
                    point.y = targetBounds.y + targetBounds.height;
                    break;
                case PlacementMode.Left:
                    point.x = targetBounds.x - this.ActualWidth;
                    break;
                case PlacementMode.Right:
                    point.x = targetBounds.x + targetBounds.width;
                    break;
                case PlacementMode.Mouse:
                    point.y += new TextBox().FontSize; // FIXME: Just a guess, it's about right.
                    break;
                default:
                    throw new NotSupportedException("PlacementMode '" + mode + "' is not supported.");
            }

            //Constrain X
            var rootWidth = root.ActualWidth;
            if ((point.x + this.ActualWidth) > rootWidth) {
                if (mode === PlacementMode.Right)
                    point.x = targetBounds.x - this.ActualWidth;
                else
                    point.x = rootWidth - this.ActualWidth;
            } else if (point.x < 0) {
                if (mode === PlacementMode.Left)
                    point.x = targetBounds.x + targetBounds.width;
                else
                    point.x = 0;
            }

            //Constrain Y
            var rootHeight = root.ActualHeight;
            if ((point.y + this.ActualHeight) > rootHeight) {
                if (mode === PlacementMode.Bottom)
                    point.y = targetBounds.y - this.ActualHeight;
                else
                    point.y = rootHeight - this.ActualHeight;
            } else if (point.y < 0) {
                if (mode === PlacementMode.Top)
                    point.y = targetBounds.y + targetBounds.height;
                else
                    point.y = 0;
            }

            this._ParentPopup.VerticalOffset = point.y;
            this._ParentPopup.HorizontalOffset = point.x;
        }

        GoToStates(gotoFunc: (state: string) => boolean) {
            if (this.IsOpen)
                gotoFunc("Open");
            else
                gotoFunc("Closed");
        }
    }
    Fayde.CoreLibrary.add(ToolTip);
    TemplateVisualStates(ToolTip,
        { GroupName: "OpenStates", Name: "Closed" },
        { GroupName: "OpenStates", Name: "Open" });
}