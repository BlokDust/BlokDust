module minerva.controls.image.render {
    export interface IInput extends core.render.IInput {
        source: IImageSource;
        imgXform: number[];
        overlap: RectOverlap;
    }
    export interface IState extends core.render.IState {
    }

    export class ImageRenderPipeDef extends core.render.RenderPipeDef {
        constructor() {
            super();
            this.replaceTapin('doRender', tapins.doRender);
        }
    }
}