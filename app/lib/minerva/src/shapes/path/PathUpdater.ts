/// <reference path="../shape/ShapeUpdater" />

module minerva.shapes.path {
    export interface IPathUpdaterAssets extends shape.IShapeUpdaterAssets, measure.IInput, processup.IInput, render.IInput {
    }

    export class PathUpdater extends shape.ShapeUpdater {
        assets: IPathUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.PathMeasurePipeDef))
                .setProcessUpPipe(singleton(processup.PathProcessUpPipeDef))
                .setRenderPipe(singleton(render.PathRenderPipeDef))
                .setHitTestPipe(singleton(hittest.PathHitTestPipeDef));

            var assets = this.assets;
            assets.stretch = Stretch.None;
            assets.stretchXform = mat3.identity();

            super.init();
        }
    }
}