/// <reference path="../polyline/PolylineUpdater" />

module minerva.shapes.polygon {
    export class PolygonUpdater extends polyline.PolylineUpdater {
        init () {
            super.init();
            this.assets.isClosed = true;
        }
    }
}