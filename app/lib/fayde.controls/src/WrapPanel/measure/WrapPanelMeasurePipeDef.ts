module Fayde.Controls.wrappanel.measure {
    import panel = minerva.controls.panel;
    export interface IInput extends panel.measure.IInput {
        orientation: Orientation;
        itemWidth: number;
        itemHeight: number;
    }
    export interface IState extends panel.measure.IState {
    }
    export interface IOutput extends panel.measure.IOutput {
    }
    export class WrapPanelMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor () {
            super();
            this.addTapinAfter('doOverride', 'doHorizontal', tapins.doHorizontal)
                .addTapinAfter('doOverride', 'doVertical', tapins.doVertical)
                .removeTapin('doOverride');
        }
    }
}