/// <reference path="../../shape/render/ShapeRenderPipeDef" />

module minerva.shapes.rectangle.render {
    export interface IInput extends shape.render.IInput {
        radiusX: number;
        radiusY: number;
        shapeRect: Rect;
    }
    export interface IState extends shape.render.IState {
    }
    export interface IOutput extends shape.render.IOutput {
    }

    export class RectangleRenderPipeDef extends shape.render.ShapeRenderPipeDef {
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
            var rx = Math.min(Math.max(0, input.radiusX), sr.width / 2.0);
            if (isNaN(rx))
                rx = 0;
            var ry = Math.min(Math.max(0, input.radiusY), sr.height / 2.0);
            if (isNaN(ry))
                ry = 0;

            helpers.draw(ctx.raw, sr.x, sr.y, sr.width, sr.height, rx, ry);

            return true;
        }
    }
}