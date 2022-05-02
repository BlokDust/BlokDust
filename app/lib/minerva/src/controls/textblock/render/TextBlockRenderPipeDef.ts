module minerva.controls.textblock.render {
    export interface IInput extends core.render.IInput, text.IDocumentContext {
        padding: Thickness;
    }

    export class TextBlockRenderPipeDef extends core.render.RenderPipeDef {
        constructor () {
            super();
            this.replaceTapin('doRender', tapins.doRender);
        }
    }

    export module tapins {
        export function doRender (input: IInput, state: core.render.IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBlockUpdaterTree): boolean {
            ctx.save();
            core.helpers.renderLayoutClip(ctx, input, tree);
            var padding = input.padding;
            if (padding)
                ctx.translate(padding.left, padding.top);
            tree.render(ctx, input);
            ctx.restore();
            return true;
        }
    }
}