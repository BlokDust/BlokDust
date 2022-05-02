module minerva.controls.image {
    export interface IImageUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, processdown.IInput, render.IInput {
    }

    export class ImageUpdater extends core.Updater {
        assets: IImageUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.ImageMeasurePipeDef))
                .setArrangePipe(singleton(arrange.ImageArrangePipeDef))
                .setProcessDownPipe(singleton(processdown.ImageProcessDownPipeDef))
                .setRenderPipe(singleton(render.ImageRenderPipeDef))
                .setHitTestPipe(singleton(hittest.ImageHitTestPipeDef));

            var assets = this.assets;
            assets.source = null;
            assets.stretch = Stretch.Uniform;
            assets.overlap = RectOverlap.In;
            assets.imgXform = mat3.identity();

            super.init();
        }

        invalidateMetrics (): ImageUpdater {
            this.assets.dirtyFlags |= DirtyFlags.ImageMetrics;
            core.Updater.$$addDownDirty(this);
            return this;
        }
    }
}