module Fayde.Controls.viewbox.processdown {
    export interface IInput extends minerva.core.processdown.IInput {
        viewXform: number[];
    }
    export interface IState extends minerva.core.processdown.IState {
    }
    export interface IOutput extends minerva.core.processdown.IOutput {
    }
    export class ViewboxProcessDownPipeDef extends minerva.core.processdown.ProcessDownPipeDef {
        constructor () {
            super();
            this.addTapinAfter('calcRenderXform', 'applyViewXform', tapins.applyViewXform);
        }
    }

    module tapins {
        export function applyViewXform (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: minerva.core.UpdaterTree): boolean {
            if ((input.dirtyFlags & minerva.DirtyFlags.Transform) === 0)
                return true;
            mat3.preapply(output.renderXform, input.viewXform);
            return true;
        }
    }
}