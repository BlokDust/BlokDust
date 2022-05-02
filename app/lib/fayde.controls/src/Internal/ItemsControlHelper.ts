module Fayde.Controls.Internal {
    export class ItemsControlHelper {
        private _itemsHost: Panel;
        private _scrollHost: ScrollViewer;

        ItemsControl: ItemsControl;

        get ItemsHost (): Panel {
            if (!(this._itemsHost instanceof Panel) && this.ItemsControl != null && this.ItemsControl.ItemContainersManager != null) {
                var container = this.ItemsControl.ItemContainersManager.ContainerFromIndex(0);
                if (container != null)
                    this._itemsHost = <Panel>VisualTreeHelper.GetParent(container);
            }
            return this._itemsHost;
        }

        get ScrollHost (): ScrollViewer {
            if (!this._scrollHost) {
                var itemsHost = this.ItemsHost;
                if (itemsHost != null) {
                    for (var cur = <DependencyObject>itemsHost; cur !== this.ItemsControl && cur != null; cur = VisualTreeHelper.GetParent(cur)) {
                        var scrollViewer = cur;
                        if (scrollViewer instanceof ScrollViewer) {
                            this._scrollHost = <ScrollViewer>scrollViewer;
                            break;
                        }
                    }
                }
            }
            return this._scrollHost;
        }

        constructor (control: ItemsControl) {
            this.ItemsControl = control;
        }

        OnApplyTemplate () {
            this._itemsHost = null;
            this._scrollHost = null;
        }

        static PrepareContainerForItemOverride (element: DependencyObject, parentItemContainerStyle: Style) {
            if (!parentItemContainerStyle)
                return;
            var control = element instanceof Control ? <Control>element : null;
            if (!control || control.Style != null)
                return;
            control.SetValue(FrameworkElement.StyleProperty, parentItemContainerStyle);
        }

        UpdateItemContainerStyle (itemContainerStyle: Style) {
            if (!itemContainerStyle)
                return;
            var itemsHost = this.ItemsHost;
            if (!itemsHost || !itemsHost.Children)
                return;
            var enumerator = itemsHost.Children.getEnumerator();
            while (enumerator.moveNext()) {
                var cur = <FrameworkElement>enumerator.current;
                if (!cur.Style)
                    cur.Style = itemContainerStyle;
            }
        }

        ScrollIntoView (element: FrameworkElement) {
            var scrollHost = this.ScrollHost;
            if (!scrollHost)
                return;
            var generalTransform: Media.GeneralTransform;
            try {
                generalTransform = element.TransformToVisual(scrollHost);
            } catch (err) {
                return;
            }
            var tl = generalTransform.Transform(new Point());
            var sz = generalTransform.Transform(new Point(element.ActualWidth, element.ActualHeight));
            var r = new minerva.Rect(tl.x, tl.y, sz.x, sz.y);

            var verticalOffset = scrollHost.VerticalOffset;
            var num1 = 0.0;
            var viewportHeight = scrollHost.ViewportHeight;
            var bottom = r.y + r.height;
            if (viewportHeight < bottom) {
                num1 = bottom - viewportHeight;
                verticalOffset += num1;
            }
            var top = r.y;
            if (top - num1 < 0.0)
                verticalOffset -= num1 - top;
            scrollHost.ScrollToVerticalOffset(verticalOffset);
            var horizontalOffset = scrollHost.HorizontalOffset;
            var num2 = 0.0;
            var viewportWidth = scrollHost.ViewportWidth;
            var right = r.x + r.width;
            if (viewportWidth < right) {
                num2 = right - viewportWidth;
                horizontalOffset += num2;
            }
            var left = r.x;
            if (left - num2 < 0.0)
                horizontalOffset -= num2 - left;
            scrollHost.ScrollToHorizontalOffset(horizontalOffset);
        }
    }
} 