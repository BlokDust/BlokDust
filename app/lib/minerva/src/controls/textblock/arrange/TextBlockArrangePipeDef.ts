module minerva.controls.textblock.arrange {
    export interface IInput extends core.arrange.IInput, text.IDocumentContext {
        padding: Thickness;
    }

    export class TextBlockArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor() {
            super();
            this.replaceTapin('doOverride', tapins.doOverride);
        }
    }

    export module tapins {
        export function doOverride(input: IInput, state: core.arrange.IState, output: core.arrange.IOutput, tree: TextBlockUpdaterTree, finalRect: Rect): boolean {
            var fs = state.finalSize;
            var as = state.arrangedSize;

            Thickness.shrinkSize(input.padding, fs);
            Size.copyTo(tree.layout(fs, input), as);
            as.width = Math.max(as.width, fs.width);
            as.height = Math.max(as.height, fs.height);
            tree.setAvailableWidth(fs.width);
            Thickness.growSize(input.padding, as);

            return true;
        }
    }
}