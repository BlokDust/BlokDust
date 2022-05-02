module minerva.controls.border.render.tapins.shim {
    export function calcBalanced (input: IInput, state: IShimState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
        if (!state.shouldRender || Thickness.isEmpty(input.borderThickness))
            return true;

        if (Thickness.isBalanced(input.borderThickness)) {
            var icr = state.innerCornerRadius;
            var ocr = state.outerCornerRadius;
            var mcr = state.middleCornerRadius;
            mcr.topLeft = (icr.topLeft + ocr.topLeft) / 2.0;
            mcr.topRight = (icr.topRight + ocr.topRight) / 2.0;
            mcr.bottomRight = (icr.bottomRight + ocr.bottomRight) / 2.0;
            mcr.bottomLeft = (icr.bottomLeft + ocr.bottomLeft) / 2.0;
            Rect.copyTo(input.extents, state.strokeExtents);
            var bt = input.borderThickness;
            Rect.shrink(state.strokeExtents, bt.left / 2.0, bt.top / 2.0, bt.right / 2.0, bt.bottom / 2.0);
        }

        return true;
    }
}