/// <reference path="ContentControl.ts" />
/// <reference path="ScrollContentPresenter.ts" />
/// <reference path="Primitives/ScrollBar.ts" />

module Fayde.Controls {
    export class ScrollViewer extends ContentControl {
        private static _ScrollBarVisibilityChanged(d: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
            if (!d) return;
            if (d instanceof ScrollViewer) {
                var sv = <ScrollViewer>d;
                sv.XamlNode.LayoutUpdater.invalidateMeasure();
                var scrollInfo = sv.ScrollInfo;
                if (scrollInfo) {
                    scrollInfo.CanHorizontallyScroll = sv.HorizontalScrollBarVisibility !== ScrollBarVisibility.Disabled;
                    scrollInfo.CanVerticallyScroll = sv.VerticalScrollBarVisibility !== ScrollBarVisibility.Disabled;
                }
                sv._UpdateScrollBarVisibility();
                return;
            }

            if (d instanceof ListBox) {
                var listbox = <ListBox>d;
                if (listbox.$TemplateScrollViewer)
                    listbox.$TemplateScrollViewer.SetValue(args.Property, args.NewValue);
                return;
            }
        }

        static HorizontalScrollBarVisibilityProperty = DependencyProperty.RegisterAttachedCore("HorizontalScrollBarVisibility", () => new Enum(ScrollBarVisibility), ScrollViewer, ScrollBarVisibility.Disabled, ScrollViewer._ScrollBarVisibilityChanged);
        static GetHorizontalScrollBarVisibility(d: DependencyObject): ScrollBarVisibility { return d.GetValue(ScrollViewer.HorizontalScrollBarVisibilityProperty); }
        static SetHorizontalScrollBarVisibility(d: DependencyObject, value: ScrollBarVisibility) { d.SetValue(ScrollViewer.HorizontalScrollBarVisibilityProperty, value); }
        get HorizontalScrollBarVisibility(): ScrollBarVisibility { return this.GetValue(ScrollViewer.HorizontalScrollBarVisibilityProperty); }
        set HorizontalScrollBarVisibility(value: ScrollBarVisibility) { this.SetValue(ScrollViewer.HorizontalScrollBarVisibilityProperty, value); }

        static VerticalScrollBarVisibilityProperty = DependencyProperty.RegisterAttachedCore("VerticalScrollBarVisibility", () => new Enum(ScrollBarVisibility), ScrollViewer, ScrollBarVisibility.Disabled, ScrollViewer._ScrollBarVisibilityChanged);
        static GetVerticalScrollBarVisibility(d: DependencyObject): ScrollBarVisibility { return d.GetValue(ScrollViewer.VerticalScrollBarVisibilityProperty); }
        static SetVerticalScrollBarVisibility(d: DependencyObject, value: ScrollBarVisibility) { d.SetValue(ScrollViewer.VerticalScrollBarVisibilityProperty, value); }
        get VerticalScrollBarVisibility(): ScrollBarVisibility { return this.GetValue(ScrollViewer.VerticalScrollBarVisibilityProperty); }
        set VerticalScrollBarVisibility(value: ScrollBarVisibility) { this.SetValue(ScrollViewer.VerticalScrollBarVisibilityProperty, value); }

        static ComputedHorizontalScrollBarVisibilityProperty = DependencyProperty.RegisterReadOnlyCore("ComputedHorizontalScrollBarVisibility", () => new Enum(Visibility), ScrollViewer);
        static ComputedVerticalScrollBarVisibilityProperty = DependencyProperty.RegisterReadOnlyCore("ComputedVerticalScrollBarVisibility", () => new Enum(Visibility), ScrollViewer);
        static HorizontalOffsetProperty = DependencyProperty.RegisterReadOnlyCore("HorizontalOffset", () => Number, ScrollViewer);
        static VerticalOffsetProperty = DependencyProperty.RegisterReadOnlyCore("VerticalOffset", () => Number, ScrollViewer);
        static ScrollableWidthProperty = DependencyProperty.RegisterReadOnlyCore("ScrollableWidth", () => Number, ScrollViewer);
        static ScrollableHeightProperty = DependencyProperty.RegisterReadOnlyCore("ScrollableHeight", () => Number, ScrollViewer);
        static ViewportWidthProperty = DependencyProperty.RegisterReadOnlyCore("ViewportWidth", () => Number, ScrollViewer);
        static ViewportHeightProperty = DependencyProperty.RegisterReadOnlyCore("ViewportHeight", () => Number, ScrollViewer);
        static ExtentWidthProperty = DependencyProperty.RegisterReadOnlyCore("ExtentWidth", () => Number, ScrollViewer);
        static ExtentHeightProperty = DependencyProperty.RegisterReadOnlyCore("ExtentHeight", () => Number, ScrollViewer);

        ComputedHorizontalScrollBarVisibility: Visibility;
        ComputedVerticalScrollBarVisibility: Visibility;
        HorizontalOffset: number;
        VerticalOffset: number;
        ScrollableWidth: number;
        ScrollableHeight: number;
        ViewportWidth: number;
        ViewportHeight: number;
        ExtentWidth: number;
        ExtentHeight: number;

        $TemplatedParentHandlesScrolling: boolean = false;
        $ScrollContentPresenter: ScrollContentPresenter;
        private $HorizontalScrollBar: Primitives.ScrollBar;
        private $VerticalScrollBar: Primitives.ScrollBar;

        constructor() {
            super();
            //this.RequestBringIntoView.Subscribe(this._OnRequestBringIntoView, this);
            this.DefaultStyleKey = ScrollViewer;
        }

        private _ScrollInfo: Primitives.IScrollInfo;
        get ScrollInfo(): Primitives.IScrollInfo { return this._ScrollInfo; }
        set ScrollInfo(value: Primitives.IScrollInfo) {
            this._ScrollInfo = value;
            if (value) {
                value.CanHorizontallyScroll = this.HorizontalScrollBarVisibility !== ScrollBarVisibility.Disabled;
                value.CanVerticallyScroll = this.VerticalScrollBarVisibility !== ScrollBarVisibility.Disabled;
            }
        }

        InvalidateScrollInfo() {
            var scrollInfo = this.ScrollInfo;
            if (scrollInfo) {
                this.SetCurrentValue(ScrollViewer.ExtentWidthProperty, scrollInfo.ExtentWidth);
                this.SetCurrentValue(ScrollViewer.ExtentHeightProperty, scrollInfo.ExtentHeight);
                this.SetCurrentValue(ScrollViewer.ViewportWidthProperty, scrollInfo.ViewportWidth);
                this.SetCurrentValue(ScrollViewer.ViewportHeightProperty, scrollInfo.ViewportHeight);
                this._UpdateScrollBar(Orientation.Horizontal, scrollInfo.HorizontalOffset);
                this._UpdateScrollBar(Orientation.Vertical, scrollInfo.VerticalOffset);
                this._UpdateScrollBarVisibility();
            }

            var lu = this.XamlNode.LayoutUpdater;

            var w = Math.max(0, this.ExtentWidth - this.ViewportWidth);
            if (w !== this.ScrollableWidth) {
                this.SetCurrentValue(ScrollViewer.ScrollableWidthProperty, w);
                lu.invalidateMeasure();
            }

            var h = Math.max(0, this.ExtentHeight - this.ViewportHeight);
            if (h !== this.ScrollableHeight) {
                this.SetCurrentValue(ScrollViewer.ScrollableHeightProperty, h);
                lu.invalidateMeasure();
            }
        }
        private _UpdateScrollBarVisibility() {
            var lu = this.XamlNode.LayoutUpdater;
            var scrollInfo = this.ScrollInfo;

            var horizontalVisibility = Visibility.Visible;
            var hsbv = this.HorizontalScrollBarVisibility;
            switch (hsbv) {
                case ScrollBarVisibility.Visible:
                    break;
                case ScrollBarVisibility.Disabled:
                case ScrollBarVisibility.Hidden:
                    horizontalVisibility = Visibility.Collapsed;
                    break;
                case ScrollBarVisibility.Auto:
                default:
                    horizontalVisibility = (!scrollInfo || scrollInfo.ExtentWidth <= scrollInfo.ViewportWidth) ? Visibility.Collapsed : Visibility.Visible;
                    break;
            }

            if (horizontalVisibility !== this.ComputedHorizontalScrollBarVisibility) {
                this.SetCurrentValue(ScrollViewer.ComputedHorizontalScrollBarVisibilityProperty, horizontalVisibility);
                lu.invalidateMeasure();
            }

            var verticalVisibility = Fayde.Visibility.Visible;
            var vsbv = this.VerticalScrollBarVisibility;
            switch (vsbv) {
                case ScrollBarVisibility.Visible:
                    break;
                case ScrollBarVisibility.Disabled:
                case ScrollBarVisibility.Hidden:
                    verticalVisibility = Fayde.Visibility.Collapsed;
                    break;
                case ScrollBarVisibility.Auto:
                default:
                    verticalVisibility = (!scrollInfo || scrollInfo.ExtentHeight <= scrollInfo.ViewportHeight) ? Fayde.Visibility.Collapsed : Fayde.Visibility.Visible;
                    break;
            }

            if (verticalVisibility !== this.ComputedVerticalScrollBarVisibility) {
                this.SetCurrentValue(ScrollViewer.ComputedVerticalScrollBarVisibilityProperty, verticalVisibility);
                lu.invalidateMeasure();
            }
        }

        private _UpdateScrollBar (orientation: Orientation, value: number) {
            var propd: DependencyProperty;
            var sb: Primitives.ScrollBar;
            if (orientation === Orientation.Horizontal) {
                propd = ScrollViewer.HorizontalOffsetProperty;
                sb = this.$HorizontalScrollBar;
            } else {
                propd = ScrollViewer.VerticalOffsetProperty;
                sb = this.$VerticalScrollBar;
            }

            try {
                this.SetCurrentValue(propd, value);
                if (sb)
                    sb.SetCurrentValue(Primitives.RangeBase.ValueProperty, value);
            } finally {
            }
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this.$ScrollContentPresenter = <ScrollContentPresenter>this.GetTemplateChild("ScrollContentPresenter", ScrollContentPresenter);
            this.$HorizontalScrollBar = <Primitives.ScrollBar>this.GetTemplateChild("HorizontalScrollBar", Primitives.ScrollBar);
            if (this.$HorizontalScrollBar) {
                this.$HorizontalScrollBar.Scroll.on((sender, e: Primitives.ScrollEventArgs) => this._HandleScroll(Orientation.Horizontal, e), this);
            }
            this.$VerticalScrollBar = <Primitives.ScrollBar>this.GetTemplateChild("VerticalScrollBar", Primitives.ScrollBar);
            if (this.$VerticalScrollBar) {
                this.$VerticalScrollBar.Scroll.on((sender, e: Primitives.ScrollEventArgs) => this._HandleScroll(Orientation.Vertical, e), this);
            }
            this._UpdateScrollBarVisibility();
        }

        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            if (!e.Handled && this.Focus())
                e.Handled = true;
            super.OnMouseLeftButtonDown(e);
        }
        OnMouseWheel(e: Input.MouseWheelEventArgs) {
            super.OnMouseWheel(e);
            if (e.Handled)
                return;
            var scrollInfo = this.ScrollInfo;
            if (!scrollInfo)
                return;
            if ((e.Delta > 0 && scrollInfo.VerticalOffset !== 0) || (e.Delta < 0 && scrollInfo.VerticalOffset < this.ScrollableHeight)) {
                if (e.Delta >= 0)
                    scrollInfo.MouseWheelUp();
                else
                    scrollInfo.MouseWheelDown();
                e.Handled = true;
            }
        }

        private _TouchOrigin: Point;
        private _Delta = new Point();
        private _TouchInitialOffset = new Point();
        OnTouchDown(e: Input.TouchEventArgs) {
            super.OnTouchDown(e);
            var scrollInfo = this.ScrollInfo;
            if (e.Handled || !this.IsEnabled || !scrollInfo)
                return;
            e.Handled = true;
            this.Focus();
            e.Device.Capture(this);

            var offset = this._TouchInitialOffset;
            offset.x = scrollInfo.HorizontalOffset;
            offset.y = scrollInfo.VerticalOffset;

            this._TouchOrigin = e.GetTouchPoint(this).Position;
        }
        OnTouchUp(e: Input.TouchEventArgs) {
            super.OnTouchUp(e);
            if (e.Handled || !this.IsEnabled)
                return;
            e.Handled = true;
            e.Device.ReleaseCapture(this);
        }
        OnTouchMove(e: Input.TouchEventArgs) {
            super.OnTouchMove(e);
            if (e.Handled || e.Device.Captured !== this)
                return;
            var tp = e.GetTouchPoint(this);
            var pos = tp.Position;
            var delta = this._Delta;
            var origin = this._TouchOrigin;
            delta.x = pos.x - origin.x;
            delta.y = pos.y - origin.y;
            this.ScrollToHorizontalOffset(delta.x);
            this.ScrollToVerticalOffset(delta.y);
        }

        OnKeyDown(e: Input.KeyEventArgs) {
            super.OnKeyDown(e);

            if (e.Handled)
                return;

            if (this.$TemplatedParentHandlesScrolling)
                return;

            var orientation = Orientation.Vertical;
            var scrollEventType = Primitives.ScrollEventType.ThumbTrack;
            //TODO: FlowDirection
            //var flowDirection = this.FlowDirection === Fayde.FlowDirection.RightToLeft;
            switch (e.Key) {
                case Input.Key.PageUp:
                    scrollEventType = Primitives.ScrollEventType.LargeDecrement;
                    break;
                case Input.Key.PageDown:
                    scrollEventType = Primitives.ScrollEventType.LargeIncrement;
                    break;
                case Input.Key.End:
                    if (!e.Modifiers.Ctrl)
                        orientation = Orientation.Horizontal;
                    scrollEventType = Primitives.ScrollEventType.Last;
                    break;
                case Input.Key.Home:
                    if (!e.Modifiers.Ctrl)
                        orientation = Orientation.Horizontal;
                    scrollEventType = Primitives.ScrollEventType.First;
                    break;
                case Input.Key.Left:
                    orientation = Orientation.Horizontal;
                    scrollEventType = Primitives.ScrollEventType.SmallDecrement;
                case Input.Key.Up:
                    scrollEventType = Primitives.ScrollEventType.SmallDecrement;
                    break;
                case Input.Key.Right:
                    orientation = Orientation.Horizontal;
                    scrollEventType = Primitives.ScrollEventType.SmallIncrement;
                case Input.Key.Down:
                    scrollEventType = Primitives.ScrollEventType.SmallIncrement;
                    break;
            }
            if (scrollEventType !== Primitives.ScrollEventType.ThumbTrack)
                e.Handled = !!this._HandleScroll(orientation, new Primitives.ScrollEventArgs(scrollEventType, 0));
        }

        ScrollInDirection(key: Input.Key) {
            switch (key) {
                case Input.Key.PageUp:
                    this.PageUp();
                    break;
                case Input.Key.PageDown:
                    this.PageDown();
                    break;
                case Input.Key.End:
                    this.PageEnd();
                    break;
                case Input.Key.Home:
                    this.PageHome();
                    break;
                case Input.Key.Left:
                    this.LineLeft();
                    break;
                case Input.Key.Up:
                    this.LineUp();
                    break;
                case Input.Key.Right:
                    this.LineRight();
                    break;
                case Input.Key.Down:
                    this.LineDown();
                    break;
            }
        }
        ScrollToHorizontalOffset(offset: number) { this._HandleHorizontalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.ThumbPosition, offset)); }
        ScrollToVerticalOffset(offset: number) { this._HandleVerticalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.ThumbPosition, offset)); }

        LineUp() { this._HandleVerticalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.SmallDecrement, 0)); }
        LineDown() { this._HandleVerticalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.SmallIncrement, 0)); }
        LineLeft() { this._HandleHorizontalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.SmallDecrement, 0)); }
        LineRight() { this._HandleHorizontalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.SmallIncrement, 0)); }

        PageHome() { this._HandleHorizontalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.First, 0)); }
        PageEnd() { this._HandleHorizontalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.Last, 0)); }

        PageUp() { this._HandleVerticalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.LargeDecrement, 0)); }
        PageDown() { this._HandleVerticalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.LargeIncrement, 0)); }
        PageLeft() { this._HandleHorizontalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.LargeDecrement, 0)); }
        PageRight() { this._HandleHorizontalScroll(new Primitives.ScrollEventArgs(Primitives.ScrollEventType.LargeIncrement, 0)); }

        private _HandleScroll(orientation: Orientation, e: Primitives.ScrollEventArgs): boolean {
            if (orientation !== Orientation.Horizontal)
                return this._HandleVerticalScroll(e);
            return this._HandleHorizontalScroll(e);
        }
        private _HandleHorizontalScroll(e: Primitives.ScrollEventArgs): boolean {
            var scrollInfo = this.ScrollInfo;
            if (!scrollInfo)
                return false;
            var offset = scrollInfo.HorizontalOffset;
            var newValue = offset;
            switch (e.ScrollEventType) {
                case Primitives.ScrollEventType.SmallDecrement:
                    return scrollInfo.LineLeft();
                case Primitives.ScrollEventType.SmallIncrement:
                    return scrollInfo.LineRight();
                case Primitives.ScrollEventType.LargeDecrement:
                    return scrollInfo.PageLeft();
                case Primitives.ScrollEventType.LargeIncrement:
                    return scrollInfo.PageRight();
                case Primitives.ScrollEventType.ThumbPosition:
                case Primitives.ScrollEventType.ThumbTrack:
                    newValue = e.Value;
                    break;
                case Primitives.ScrollEventType.First:
                    newValue = Number.NEGATIVE_INFINITY;
                    break;
                case Primitives.ScrollEventType.Last:
                    newValue = Number.POSITIVE_INFINITY;
                    break;
            }
            newValue = Math.max(newValue, 0);
            newValue = Math.min(this.ScrollableWidth, newValue);
            if (NumberEx.AreClose(offset, newValue))
                return false;
            scrollInfo.SetHorizontalOffset(newValue);
            return true;
        }
        private _HandleVerticalScroll(e: Primitives.ScrollEventArgs): boolean {
            var scrollInfo = this.ScrollInfo;
            if (!scrollInfo)
                return false;
            var offset = scrollInfo.VerticalOffset;
            var newValue = offset;
            switch (e.ScrollEventType) {
                case Primitives.ScrollEventType.SmallDecrement:
                    return scrollInfo.LineUp();
                case Primitives.ScrollEventType.SmallIncrement:
                    return scrollInfo.LineDown();
                    break;
                case Primitives.ScrollEventType.LargeDecrement:
                    return scrollInfo.PageUp();
                    break;
                case Primitives.ScrollEventType.LargeIncrement:
                    return scrollInfo.PageDown();
                    break;
                case Primitives.ScrollEventType.ThumbPosition:
                case Primitives.ScrollEventType.ThumbTrack:
                    newValue = e.Value;
                    break;
                case Primitives.ScrollEventType.First:
                    newValue = Number.NEGATIVE_INFINITY;
                    break;
                case Primitives.ScrollEventType.Last:
                    newValue = Number.POSITIVE_INFINITY;
                    break;
            }
            newValue = Math.max(newValue, 0);
            newValue = Math.min(this.ScrollableHeight, newValue);
            if (NumberEx.AreClose(offset, newValue))
                return false;
            return scrollInfo.SetVerticalOffset(newValue);
        }
    }
    Fayde.CoreLibrary.add(ScrollViewer);
    TemplateParts(ScrollViewer,
        { Name: "ScrollContentPresenter", Type: ScrollContentPresenter },
        { Name: "HorizontalScrollBar", Type: Primitives.ScrollBar },
        { Name: "VerticalScrollBar", Type: Primitives.ScrollBar });
}