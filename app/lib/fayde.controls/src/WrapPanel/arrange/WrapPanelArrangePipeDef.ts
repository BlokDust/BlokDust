module Fayde.Controls.wrappanel.arrange {
    import panel = minerva.controls.panel;
    export interface IInput extends panel.arrange.IInput {
        orientation: Orientation;
        itemWidth: number;
        itemHeight: number;
    }
    export interface IState extends panel.arrange.IState {
    }
    export interface IOutput extends panel.arrange.IOutput {
    }
    export class WrapPanelArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor () {
            super();
            this.addTapinAfter('doOverride', 'doHorizontal', tapins.doHorizontal)
                .addTapinAfter('doOverride', 'doVertical', tapins.doVertical)
                .removeTapin('doOverride');
        }
    }
}