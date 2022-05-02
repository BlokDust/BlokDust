module Fayde.Controls {

    var dragIncrement = 1;
    var keyIncrement = 10;

    export class GridSplitter extends Control {
        private _Helper: Internal.GridSplitterResizer;
        private _HorizontalTemplate: FrameworkElement = null;
        private _VerticalTemplate: FrameworkElement = null;
        private _DragStart: Point = null;
        private _IsDragging = false;

        constructor() {
            super();
            this.DefaultStyleKey = GridSplitter;
            this._Helper = new Internal.GridSplitterResizer(this);
            this.LayoutUpdated.on(this._OnLayoutUpdated, this);
        }

        OnApplyTemplate() {
            super.OnApplyTemplate();
            this._HorizontalTemplate = <FrameworkElement>this.GetTemplateChild("HorizontalTemplate", FrameworkElement);
            this._VerticalTemplate = <FrameworkElement>this.GetTemplateChild("VerticalTemplate", FrameworkElement);
            this._Helper.UpdateResizeDirection(this);
            this._OnResizeDirectionChanged();
            this.UpdateVisualState();
        }
        private _OnLayoutUpdated(sender: any, e: any) {
            if (this._Helper && this._Helper.UpdateResizeDirection(this))
                this._OnResizeDirectionChanged();
        }
        private _OnResizeDirectionChanged() {
            var isColumns = this._Helper.Direction === Internal.GridResizeDirection.Columns;

            this.Cursor = isColumns ? CursorType.SizeWE : CursorType.SizeNS;

            var ht = this._HorizontalTemplate;
            if (ht)
                ht.Visibility = !isColumns ? Visibility.Visible : Visibility.Collapsed;
            var vt = this._VerticalTemplate;
            if (vt)
                vt.Visibility = isColumns ? Visibility.Visible : Visibility.Collapsed;
        }

        OnGotFocus(e: RoutedEventArgs) {
            super.OnGotFocus(e);
            this.UpdateVisualState();
        }
        OnLostFocus(e: RoutedEventArgs) {
            super.OnLostFocus(e);
            this.UpdateVisualState();
        }
        OnKeyDown(e: Input.KeyEventArgs) {
            super.OnKeyDown(e);
            if (e.Key === Fayde.Input.Key.Escape) {
                if (!this._Helper)
                    return;
                this._Helper = null;
                e.Handled = true;
                return;
            }
            if (!this.IsFocused || !this.IsEnabled)
                return;
            var horiz = 0;
            var vert = 0;
            switch (e.Key) {
                case Fayde.Input.Key.Left:
                    horiz = -keyIncrement;
                    break;
                case Fayde.Input.Key.Up:
                    vert = -keyIncrement;
                    break;
                case Fayde.Input.Key.Right:
                    horiz = keyIncrement;
                    break;
                case Fayde.Input.Key.Down:
                    vert = keyIncrement;
                    break;
            }
            if (this.FlowDirection === FlowDirection.RightToLeft)
                e.Handled = this._HandleMove(-horiz, vert, true);
            else
                e.Handled = this._HandleMove(horiz, vert, true);
        }

        OnMouseLeftButtonDown(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonDown(e);
            if (!this.IsEnabled)
                return;
            this._IsDragging = this.CaptureMouse();
            if (!this._IsDragging)
                return;
            this._DragStart = this._GetTransformedPos(e);
            this.Focus();
            this.InitHelper();
        }
        OnMouseLeftButtonUp(e: Input.MouseButtonEventArgs) {
            super.OnMouseLeftButtonUp(e);
            this.ReleaseMouseCapture();
            this._IsDragging = false;
            this._Helper = null;
            this.UpdateVisualState();
        }
        OnMouseMove(e: Input.MouseEventArgs) {
            super.OnMouseMove(e);
            if (!this._IsDragging)
                return;
            var pos = this._GetTransformedPos(e);
            if (pos)
                this._HandleMove(pos.x - this._DragStart.x, pos.y - this._DragStart.y, false);
        }

        private InitHelper() {
            var parent = <Grid>this.VisualParent;
            if (!(parent instanceof Grid))
                return;
            this._Helper = new Internal.GridSplitterResizer(this);
            if (this._Helper.Setup(this, parent))
                return;
            this._Helper = null;
        }
        private _HandleMove(horiz: number, vert: number, isKeyboard: boolean): boolean {
            if (isKeyboard) {
                if (this._Helper)
                    return false;
                this.InitHelper();
            }
            if (!this._Helper)
                return false;
            if (!this._Helper.Move(<Grid>this.VisualParent, horiz, vert) || isKeyboard)
                this._Helper = null;
            return true;
        }
        private _GetTransformedPos(e: Input.MouseEventArgs) {
            if (this.RenderTransform)
                return this.RenderTransform.Transform(e.GetPosition(this));
            return e.GetPosition(this);
        }
    }
}