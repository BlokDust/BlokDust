module minerva.controls.textboxview.processup {
    export interface IInput extends core.processup.IInput, text.IDocumentContext {
    }

    export class TextBoxViewProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor () {
            super();
            this.replaceTapin('calcActualSize', tapins.calcActualSize)
                .replaceTapin('calcExtents', tapins.calcExtents);
        }
    }

    export module tapins {
        export function calcActualSize (input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBoxViewUpdaterTree): boolean {
            if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
                return true;

            var as = state.actualSize;
            as.width = Number.POSITIVE_INFINITY;
            as.height = Number.POSITIVE_INFINITY;
            core.helpers.coerceSize(as, input);

            Size.copyTo(tree.layout(as, input), as);

            return true;
        }

        export function calcExtents (input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBoxViewUpdaterTree): boolean {
            if ((input.dirtyFlags & DirtyFlags.Bounds) === 0)
                return true;

            var e = output.extents;
            e.x = e.y = 0;
            Size.copyTo(state.actualSize, e);
            Rect.copyTo(e, output.extentsWithChildren);
            output.extentsWithChildren.width++; //include caret

            return true;
        }
    }
}