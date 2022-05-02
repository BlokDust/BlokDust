module minerva.controls.panel.processup {
    export interface IInput extends core.processup.IInput {
        background: IBrush;
    }
    export interface IState extends core.processup.IState {
    }
    export interface IOutput extends core.processup.IOutput {
    }

    export class PanelProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor () {
            super();
            this.addTapinBefore('calcExtents', 'preCalcExtents', tapins.preCalcExtents);
        }
    }
}