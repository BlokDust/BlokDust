module Fayde.Controls.tabpanel {
    export interface ITabPanelUpdaterAssets extends minerva.controls.panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }
    export class TabPanelUpdater extends minerva.controls.panel.PanelUpdater {
        assets: ITabPanelUpdaterAssets;

        init () {
            this.setMeasurePipe(minerva.singleton(measure.TabPanelMeasurePipeDef))
                .setArrangePipe(minerva.singleton(arrange.TabPanelArrangePipeDef));

            var assets = this.assets;
            assets.tabAlignment = Dock.Top;
            assets.numRows = 1;
            assets.numHeaders = 0;
            assets.rowHeight = 0.0;

            super.init();
        }
    }
}