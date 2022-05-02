/// <reference path="../../panel/processup/PanelProcessUpPipeDef" />

module minerva.controls.grid.processup {
    export interface IInput extends panel.processup.IInput {
        showGridLines: boolean;
    }
    export interface IState extends panel.processup.IState {
    }
    export interface IOutput extends panel.processup.IOutput {
    }

    export class GridProcessUpPipeDef extends panel.processup.PanelProcessUpPipeDef {
        constructor () {
            super();
            this.replaceTapin('preCalcExtents', tapins.preCalcExtents)
                .replaceTapin('calcExtents', tapins.calcExtents);
        }
    }
}