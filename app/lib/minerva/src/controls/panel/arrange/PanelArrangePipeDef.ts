module minerva.controls.panel.arrange {
    export interface IInput extends core.arrange.IInput {
    }
    export interface IState extends core.arrange.IState {
    }
    export interface IOutput extends core.arrange.IOutput {
    }

    export class PanelArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride);
        }
    }
}