module Fayde.Controls.wrappanel {
    export interface IWrapPanelUpdaterAssets extends minerva.controls.panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }

    export class WrapPanelUpdater extends minerva.controls.panel.PanelUpdater {
        assets: IWrapPanelUpdaterAssets;

        init () {
            this.setMeasurePipe(minerva.singleton(measure.WrapPanelMeasurePipeDef))
                .setArrangePipe(minerva.singleton(arrange.WrapPanelArrangePipeDef));

            var assets = this.assets;
            assets.orientation = Orientation.Horizontal;
            assets.itemWidth = NaN;
            assets.itemHeight = NaN;

            super.init();
        }
    }
}