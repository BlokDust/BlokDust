/// <reference path="../shape/ShapeUpdater" />

module minerva.shapes.rectangle {
    export interface IRectangleUpdaterAssets extends shape.IShapeUpdaterAssets, render.IInput {
    }

    export class RectangleUpdater extends shape.ShapeUpdater {
        assets: IRectangleUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.RectangleMeasurePipeDef))
                .setRenderPipe(singleton(render.RectangleRenderPipeDef))
                .setHitTestPipe(singleton(hittest.RectangleHitTestPipeDef));

            var assets = this.assets;
            assets.stretch = Stretch.Fill;
            assets.radiusX = 0;
            assets.radiusY = 0;

            super.init();
        }
    }
}