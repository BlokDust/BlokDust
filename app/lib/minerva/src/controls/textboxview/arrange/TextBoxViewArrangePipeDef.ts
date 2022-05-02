module minerva.controls.textboxview.arrange {
    export interface IInput extends core.arrange.IInput, text.IDocumentContext {
    }

    export class TextBoxViewArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride);
        }
    }

    export module tapins {
        export function doOverride (input: IInput, state: core.arrange.IState, output: core.arrange.IOutput, tree: TextBoxViewUpdaterTree, finalRect: Rect): boolean {
            var fs = state.finalSize;
            var as = state.arrangedSize;

            Size.copyTo(tree.layout(fs, input), as);
            as.width = Math.max(as.width, fs.width);
            as.height = Math.max(as.height, fs.height);
            tree.setAvailableWidth(fs.width);

            return true;
        }
    }
}