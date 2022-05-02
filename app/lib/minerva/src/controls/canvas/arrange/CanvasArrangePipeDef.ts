/// <reference path="../../panel/arrange/PanelArrangePipeDef" />

module minerva.controls.canvas.arrange {
    export interface IInput extends panel.arrange.IInput {
    }
    export interface IState extends panel.arrange.IState {
    }
    export interface IOutput extends panel.arrange.IOutput {
    }

    export class CanvasArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride)
                .replaceTapin('buildLayoutClip', tapins.buildLayoutClip);
        }
    }
}