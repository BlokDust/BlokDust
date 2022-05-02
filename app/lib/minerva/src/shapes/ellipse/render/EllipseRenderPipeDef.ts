/// <reference path="../../shape/render/ShapeRenderPipeDef" />

module minerva.shapes.ellipse.render {
    export interface IInput extends shape.render.IInput {
        shapeRect: Rect;
    }
    export interface IState extends shape.render.IState {
    }
    export interface IOutput extends shape.render.IOutput {
    }

    export class EllipseRenderPipeDef extends shape.render.ShapeRenderPipeDef {
        constructor () {
            super();
            this.replaceTapin('doRender', tapins.doRender);
        }
    }

    export module tapins {
        export function doRender (input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean {
            if (!state.shouldDraw)
                return true;

            var sr = input.shapeRect;
            helpers.draw(ctx.raw, sr.x, sr.y, sr.width, sr.height);

            return true;
        }
    }
}