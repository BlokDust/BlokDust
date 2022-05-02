module minerva.controls.scrollcontentpresenter {
    export interface IScrollContentPresenterUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput {
    }

    export class ScrollContentPresenterUpdater extends core.Updater {
        assets: IScrollContentPresenterUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.ScrollContentPresenterMeasurePipeDef))
                .setArrangePipe(singleton(arrange.ScrollContentPresenterArrangePipeDef))
                .setRenderPipe(singleton(render.ScrollContentPresenterRenderPipeDef));

            var assets = this.assets;
            assets.internalClip = new Rect();
            assets.scrollData = {
                canHorizontallyScroll: false,
                canVerticallyScroll: false,
                offsetX: 0,
                offsetY: 0,
                cachedOffsetX: 0,
                cachedOffsetY: 0,
                viewportWidth: 0,
                viewportHeight: 0,
                extentWidth: 0,
                extentHeight: 0,
                maxDesiredWidth: 0,
                maxDesiredHeight: 0,
                invalidate: function () {
                }
            };

            super.init();
        }
    }
}