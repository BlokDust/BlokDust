module minerva.shapes.shape.render {
    export interface IInput extends core.render.IInput {
        fill: IBrush;
        fillRule: FillRule;
        stroke: IBrush;
        strokeThickness: number;
        strokeStartLineCap: PenLineCap;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;

        shapeFlags: ShapeFlags;
        shapeRect: Rect;
        naturalBounds: Rect;
    }
    export interface IState extends core.render.IState {
        shouldDraw: boolean;
    }
    export interface IOutput extends core.render.IOutput {
    }

    export class ShapeRenderPipeDef extends core.render.RenderPipeDef {
        constructor () {
            super();
            this.addTapinBefore('doRender', 'calcShouldDraw', tapins.calcShouldDraw)
                .addTapinBefore('doRender', 'prepareDraw', tapins.prepareDraw)
                .replaceTapin('doRender', tapins.doRender)
                .addTapinAfter('doRender', 'fill', tapins.fill)
                .addTapinAfter('fill', 'finishDraw', tapins.finishDraw)
                .addTapinAfter('finishDraw', 'stroke', tapins.stroke);
        }

        createState (): IState {
            var state = <IState>super.createState();
            state.shouldDraw = false;
            return state;
        }
    }
}