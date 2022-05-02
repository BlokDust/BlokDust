/// <reference path="../path/PathUpdater" />

module minerva.shapes.polyline {
    export interface IPolylineUpdaterAssets extends path.IPathUpdaterAssets, measure.IInput {
    }

    export class PolylineUpdater extends path.PathUpdater {
        assets: IPolylineUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.PolylineMeasurePipeDef));

            var assets = this.assets;
            assets.data = new path.AnonPathGeometry();
            assets.isClosed = false;

            super.init();
        }

        invalidateFillRule () {
            this.assets.data.fillRule = this.assets.fillRule;
            this.invalidate();
        }

        invalidatePath () {
            this.assets.data.old = true;
            this.invalidateNaturalBounds();
        }
    }
}