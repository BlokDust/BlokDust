module minerva.controls.canvas.processdown {
    export class CanvasProcessDownPipeDef extends core.processdown.ProcessDownPipeDef {
        constructor () {
            super();
            this.replaceTapin('processLayoutClip', tapins.processLayoutClip);
        }
    }

    export module tapins {
        export function processLayoutClip (input: core.processdown.IInput, state: core.processdown.IState, output: core.processdown.IOutput, vpinput: core.processdown.IInput, tree: core.IUpdaterTree): boolean {
            if ((input.dirtyFlags & DirtyFlags.LayoutClip) === 0)
                return true;

            var clc = input.compositeLayoutClip;
            clc.x = clc.y = clc.width = clc.height;
            return true;
        }
    }
}