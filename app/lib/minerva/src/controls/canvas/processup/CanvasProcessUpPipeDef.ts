module minerva.controls.canvas.processup {
    export interface IInput extends core.processup.IInput {
    }
    export interface IState extends core.processup.IState {
    }
    export interface IOutput extends core.processup.IOutput {
    }
    export class CanvasProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor () {
            super();
            this.replaceTapin('calcPaintBounds', tapins.calcPaintBounds);
        }
    }
}