module minerva.controls.stackpanel.arrange {
    export interface IInput extends panel.arrange.IInput {
        orientation: Orientation;
    }
    export interface IState extends panel.arrange.IState {
    }
    export interface IOutput extends panel.arrange.IOutput {
    }

    export class StackPanelArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride)
                .addTapinAfter('doOverride', 'doHorizontal', tapins.doHorizontal)
                .addTapinAfter('doOverride', 'doVertical', tapins.doVertical);
        }
    }
}