/// <reference path="../virtualizingpanel/VirtualizingPanelUpdater" />

module minerva.controls.virtualizingstackpanel {
    export interface IVirtualizingStackPanelUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }

    export class VirtualizingStackPanelUpdater extends virtualizingpanel.VirtualizingPanelUpdater {
        assets: IVirtualizingStackPanelUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(measure.VirtualizingStackPanelMeasurePipeDef))
                .setArrangePipe(singleton(arrange.VirtualizingStackPanelArrangePipeDef));

            var assets = this.assets;
            assets.orientation = Orientation.Vertical;
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