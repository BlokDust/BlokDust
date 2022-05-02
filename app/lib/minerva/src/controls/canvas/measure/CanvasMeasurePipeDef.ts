/// <reference path="../../panel/measure/PanelMeasurePipeDef" />

module minerva.controls.canvas.measure {
    export interface IInput extends panel.measure.IInput {
    }
    export interface IState extends panel.measure.IState {
    }
    export interface IOutput extends panel.measure.IOutput {
    }

    export class CanvasMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride);
        }
    }
}