module Fayde.Controls.Internal {
    var LineChange = 16.0;
    export class ScrollEx {
        static HandleKey(sv: ScrollViewer, key: Input.Key, flowDirection: FlowDirection): boolean {
            if (!sv)
                return false;
            var isRTL = flowDirection === FlowDirection.RightToLeft;
            switch (key) {
                case Input.Key.PageUp:
                    if (!NumberEx.IsGreaterThanClose(sv.ExtentHeight, sv.ViewportHeight))
                        ScrollEx.PageLeft(sv);
                    else
                        ScrollEx.PageUp(sv);
                    return true;
                case Input.Key.PageDown:
                    if (!NumberEx.IsGreaterThanClose(sv.ExtentHeight, sv.ViewportHeight))
                        ScrollEx.PageRight(sv);
                    else
                        ScrollEx.PageDown(sv);
                    return true;
                case Input.Key.End:
                    ScrollEx.ScrollToBottom(sv);
                    return true;
                case Input.Key.Home:
                    ScrollEx.ScrollToTop(sv);
                    return true;
                case Input.Key.Left:
                    isRTL ? ScrollEx.LineRight(sv) : ScrollEx.LineLeft(sv);
                    return true;
                case Input.Key.Up:
                    ScrollEx.LineUp(sv);
                    return true;
                case Input.Key.Right:
                    isRTL ? ScrollEx.LineLeft(sv) : ScrollEx.LineRight(sv);
                    return true;
                case Input.Key.Down:
                    ScrollEx.LineDown(sv);
                    return true;
            }
            return false;
        }

        static LineUp(viewer: ScrollViewer) {
            scrollByVerticalOffset(viewer, -16.0);
        }
        static LineDown(viewer: ScrollViewer) {
            scrollByVerticalOffset(viewer, 16.0);
        }
        static LineLeft(viewer: ScrollViewer) {
            scrollByHorizontalOffset(viewer, -16.0);
        }
        static LineRight(viewer: ScrollViewer) {
            scrollByHorizontalOffset(viewer, 16.0);
        }

        static PageUp(viewer: ScrollViewer) {
            scrollByVerticalOffset(viewer, -viewer.ViewportHeight);
        }
        static PageDown(viewer: ScrollViewer) {
            scrollByVerticalOffset(viewer, viewer.ViewportHeight);
        }
        static PageLeft(viewer: ScrollViewer) {
            scrollByHorizontalOffset(viewer, -viewer.ViewportWidth);
        }
        static PageRight(viewer: ScrollViewer) {
            scrollByHorizontalOffset(viewer, viewer.ViewportWidth);
        }

        static ScrollToTop(viewer: ScrollViewer) {
            viewer.ScrollToVerticalOffset(0.0);
        }
        static ScrollToBottom(viewer: ScrollViewer) {
            viewer.ScrollToVerticalOffset(viewer.ExtentHeight);
        }

        static GetTopAndBottom(element: FrameworkElement, parent: FrameworkElement, top: IOutValue, bottom: IOutValue) {
            var xform = element.TransformToVisual(parent);
            top.Value = xform.Transform(new Point(0.0, 0.0)).y;
            bottom.Value = xform.Transform(new Point(0.0, element.ActualHeight)).y;
        }
    }

    function scrollByVerticalOffset(viewer: ScrollViewer, offset: number) {
        offset += viewer.VerticalOffset;
        offset = Math.max(Math.min(offset, viewer.ExtentHeight), 0.0);
        viewer.ScrollToVerticalOffset(offset);
    }
    function scrollByHorizontalOffset(viewer: ScrollViewer, offset: number) {
        offset += viewer.HorizontalOffset;
        offset = Math.max(Math.min(offset, viewer.ExtentWidth), 0.0);
        viewer.ScrollToHorizontalOffset(offset);
    }
}