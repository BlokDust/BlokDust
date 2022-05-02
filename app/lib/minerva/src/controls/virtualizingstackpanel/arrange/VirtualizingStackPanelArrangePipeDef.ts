module minerva.controls.virtualizingstackpanel.arrange {
    export interface IInput extends panel.arrange.IInput {
        orientation: Orientation;
        scrollData: IScrollData;
    }
    export interface IState extends panel.arrange.IState {
    }
    export interface IOutput extends panel.arrange.IOutput {
    }

    export class VirtualizingStackPanelArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride)
                .addTapinAfter('doOverride', 'doHorizontal', tapins.doHorizontal)
                .addTapinAfter('doOverride', 'doVertical', tapins.doVertical);
        }
    }
}