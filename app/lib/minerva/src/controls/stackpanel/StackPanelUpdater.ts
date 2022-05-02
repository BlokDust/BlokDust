module minerva.controls.stackpanel {
    export interface IStackPanelUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }
    export class StackPanelUpdater extends panel.PanelUpdater {
        assets: IStackPanelUpdaterAssets;

        init () {
            this.setMeasurePipe(singleton(stackpanel.measure.StackPanelMeasurePipeDef))
                .setArrangePipe(singleton(stackpanel.arrange.StackPanelArrangePipeDef));

            this.assets.orientation = Orientation.Vertical;

            super.init();
        }
    }
}