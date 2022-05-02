module minerva.controls.textblock.processup {
    export interface IInput extends core.processup.IInput, text.IDocumentContext {
        padding: Thickness;
    }

    export class TextBlockProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor () {
            super();
            this.replaceTapin('calcActualSize', tapins.calcActualSize)
                .replaceTapin('calcExtents', tapins.calcExtents);
        }
    }

    export module tapins {
        export function calcActualSize (input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBlockUpdaterTree): boolean {
            if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
                return true;

            var actual = state.actualSize;
            actual.width = Number.POSITIVE_INFINITY;
            actual.height = Number.POSITIVE_INFINITY;
            core.helpers.coerceSize(actual, input);

            Thickness.shrinkSize(input.padding, actual);
            Size.copyTo(tree.layout(actual, input), actual);
            Thickness.growSize(input.padding, actual);

            return true;
        }

        export function calcExtents (input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBlockUpdaterTree): boolean {
            if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
                return true;

            var e = output.extents;
            e.x = tree.getHorizontalOffset(input);
            e.y = 0;
            Size.copyTo(state.actualSize, e);

            var padding = input.padding;
            e.x += padding.left;
            e.y += padding.top;
            Rect.copyTo(e, output.extentsWithChildren);

            return true;
        }
    }
}