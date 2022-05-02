/// <reference path="../path/PathUpdater" />

module minerva.shapes.line {
    export interface ILineUpdaterAssets extends path.IPathUpdaterAssets, measure.IInput {
    }

    export class LineUpdater extends path.PathUpdater {
        assets: ILineUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.LineMeasurePipeDef));

            var assets = this.assets;
            assets.x1 = 0;
            assets.y1 = 0;
            assets.x2 = 0;
            assets.y2 = 0;

            assets.data = new path.AnonPathGeometry();

            super.init();
        }

        invalidatePath () {
            this.assets.data.old = true;
            this.invalidateNaturalBounds();
        }
    }
}