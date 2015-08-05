/**
 * Created by luketwyman on 05/08/2015.
 */


class StageDragger {

    private _DragStart: Point;
    private _OffsetStart: Point;
    private _Dragging: boolean = false;

    MouseDown(point: Point) {
        this._DragStart = new Point(point.x,point.y);
        this._OffsetStart = new Point(App.DragOffset.x,App.DragOffset.y);
        this._Dragging = true;
    }

    MouseMove(point: Point) {
        if (this._Dragging) {
            this.Drag(point);
        }
    }

    MouseUp() {
        this._Dragging = false;
    }

    Drag(point: Point) {
        var speed = App.Config.ScrollSpeed;
        App.DragOffset.x = this._OffsetStart.x + (((point.x - this._DragStart.x)*(speed/App.ZoomLevel)));
        App.DragOffset.y = this._OffsetStart.y + (((point.y - this._DragStart.y)*(speed/App.ZoomLevel)));
        App.Metrics.UpdateGridScale();
    }

}

export = StageDragger;