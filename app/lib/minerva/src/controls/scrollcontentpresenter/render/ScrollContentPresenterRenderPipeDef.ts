module minerva.controls.scrollcontentpresenter.render {
    export interface IInput extends core.render.IInput {
        internalClip: Rect;
    }

    export class ScrollContentPresenterRenderPipeDef extends core.render.RenderPipeDef {
        constructor () {
            super();
            this.addTapinAfter('applyClip', 'applyInternalClip', tapins.applyInternalClip);
        }
    }

    export module tapins {
        export function applyInternalClip (input: IInput, state: core.render.IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
            if (Rect.isEmpty(input.internalClip))
                return true;
            ctx.clipRect(input.internalClip);
            return true;
        }
    }
}