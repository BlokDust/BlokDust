/// <reference path="../../core/Updater" />

module minerva.controls.border {
    export interface IBorderUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput {
    }

    export class BorderUpdater extends core.Updater {
        tree: BorderUpdaterTree;
        assets: IBorderUpdaterAssets;

        init () {
            this.setTree(new BorderUpdaterTree())
                .setMeasurePipe(singleton(measure.BorderMeasurePipeDef))
                .setArrangePipe(singleton(arrange.BorderArrangePipeDef))
                .setRenderPipe(singleton(core.render.RenderContext.hasFillRule ? render.BorderRenderPipeDef : render.ShimBorderRenderPipeDef))
                .setHitTestPipe(singleton(hittest.BorderHitTestPipeDef));

            var assets = this.assets;
            assets.padding = new Thickness();
            assets.borderThickness = new Thickness();
            assets.cornerRadius = new CornerRadius();

            super.init();
        }
    }
}