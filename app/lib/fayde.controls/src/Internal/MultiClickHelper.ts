module Fayde.Controls.Internal {
    export class MultiClickHelper {
        ClickCount = 0;
        LastClickTime: number;
        LastClickPosition: Point;
        OnMouseLeftButtonDown(control: Control, e: Input.MouseButtonEventArgs) {
            if (!control.IsEnabled) {
                this.ClickCount = 1;
                return;
            }

            var now = new Date().getTime();
            var deltaMs = now - this.LastClickTime;
            var pos = e.GetPosition(control);
            var dist = getDistance(this.LastClickPosition, pos);

            if (deltaMs < 500.0 && dist < 9.0)
                this.ClickCount++;
            else
                this.ClickCount = 1;

            this.LastClickTime = now;
            this.LastClickPosition = pos;
        }
    }

    function getDistance(oldPosition: Point, newPosition: Point): number {
        var xdiff = newPosition.x;
        var ydiff = newPosition.y;
        if (oldPosition) {
            xdiff -= oldPosition.x;
            ydiff -= oldPosition.y;
        }
        return xdiff * xdiff + ydiff * ydiff;
    }
}