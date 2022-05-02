module minerva.controls.textblock.measure {
    export interface IInput extends core.measure.IInput, text.IDocumentContext {
        padding: Thickness;
    }

    export class TextBlockMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor() {
            super();
            this.replaceTapin('doOverride', tapins.doOverride);
        }
    }

    export module tapins {
        export function doOverride(input: IInput, state: core.measure.IState, output: core.measure.IOutput, tree: TextBlockUpdaterTree, availableSize: Size): boolean {
            var ds = output.desiredSize;

            Thickness.shrinkSize(input.padding, state.availableSize);
            tree.setMaxWidth(state.availableSize.width, input);
            Size.copyTo(tree.layout(state.availableSize, input), ds);
            Thickness.growSize(input.padding, ds);

            return true;
        }
    }
}