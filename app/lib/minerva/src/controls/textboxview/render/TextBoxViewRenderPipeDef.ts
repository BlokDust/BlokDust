module minerva.controls.textboxview.render {
    export interface IInput extends core.render.IInput, text.IDocumentContext {
        isCaretVisible: boolean;
        caretRegion: Rect;
        caretBrush: IBrush;
    }
    export interface IOutput extends core.render.IOutput {
        caretRegion: Rect;
    }

    export class TextBoxViewRenderPipeDef extends core.render.RenderPipeDef {
        constructor () {
            super();
            this.replaceTapin('doRender', tapins.doRender)
                .addTapinAfter('doRender', 'calcCaretRegion', tapins.calcCaretRegion)
                .addTapinAfter('calcCaretRegion', 'renderCaret', tapins.renderCaret);
        }

        createOutput () {
            var output = <IOutput>super.createOutput();
            output.caretRegion = new Rect();
            return output;
        }

        prepare (input: IInput, state: core.render.IState, output: IOutput) {
            Rect.copyTo(input.caretRegion, output.caretRegion);
            super.prepare(input, state, output);
        }

        flush (input: IInput, state: core.render.IState, output: IOutput) {
            super.flush(input, state, output);
            Rect.copyTo(output.caretRegion, input.caretRegion);
        }
    }

    export module tapins {
        export function doRender (input: IInput, state: core.render.IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBoxViewUpdaterTree): boolean {
            ctx.save();
            core.helpers.renderLayoutClip(ctx, input, tree);
            tree.render(ctx, input);
            ctx.restore();
            return true;
        }

        export function calcCaretRegion (input: IInput, state: core.render.IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBoxViewUpdaterTree): boolean {
            if (!Rect.isEmpty(output.caretRegion) || input.selectionLength > 0)
                return true;
            Rect.copyTo(tree.getCaretRegion(input), output.caretRegion);
            return true;
        }

        export function renderCaret (input: IInput, state: core.render.IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBoxViewUpdaterTree): boolean {
            if (!input.isCaretVisible || input.selectionLength > 0)
                return true;

            var region = output.caretRegion;
            var brush = input.caretBrush;
            var raw = ctx.raw;

            raw.beginPath();
            raw.moveTo(region.x + 0.5, region.y);
            raw.lineTo(region.x + 0.5, region.y + region.height);
            raw.lineWidth = 1.0;
            if (brush) {
                brush.setupBrush(raw, region);
                raw.strokeStyle = brush.toHtml5Object();
            } else {
                raw.strokeStyle = "#000000";
            }
            raw.stroke();

            return true;
        }
    }
}