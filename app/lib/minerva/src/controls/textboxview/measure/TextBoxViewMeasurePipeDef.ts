module minerva.controls.textboxview.measure {
    export interface IInput extends core.measure.IInput, text.IDocumentContext {
    }

    export class TextBoxViewMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride);
        }
    }

    export module tapins {
        export function doOverride (input: IInput, state: core.measure.IState, output: core.measure.IOutput, tree: TextBoxViewUpdaterTree, availableSize: Size): boolean {
            var ds = output.desiredSize;
            var available = state.availableSize;
            tree.setMaxWidth(available.width, input);
            Size.copyTo(tree.layout(available, input), ds);
            if (!isFinite(available.width))
                ds.width = Math.max(ds.width, 11);
            ds.width = Math.min(ds.width, available.width);
            ds.height = Math.min(ds.height, available.height);
            return true;
        }
    }
}