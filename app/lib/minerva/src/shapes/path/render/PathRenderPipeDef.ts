/// <reference path="../../shape/render/ShapeRenderPipeDef" />

module minerva.shapes.path.render {
    export interface IInput extends shape.render.IInput {
        data: AnonPathGeometry;
        stretchXform: number[];
    }
    export interface IState extends shape.render.IState {
    }
    export interface IOutput extends shape.render.IOutput {
    }

    export class PathRenderPipeDef extends shape.render.ShapeRenderPipeDef {
        constructor () {
            super();
            this.replaceTapin('doRender', tapins.doRender)
                .replaceTapin('fill', tapins.fill);
        }
    }
}