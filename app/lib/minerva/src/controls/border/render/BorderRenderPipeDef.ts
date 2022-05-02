module minerva.controls.border.render {
    export interface IInput extends core.render.IInput {
        extents: Rect;
        background: IBrush;
        borderBrush: IBrush;
        borderThickness: Thickness;
        cornerRadius: CornerRadius;
    }
    export interface IState extends core.render.IState {
        shouldRender: boolean;
        fillExtents: Rect;
        innerCornerRadius: CornerRadius;
        outerCornerRadius: CornerRadius;
    }
    export interface IOutput extends core.render.IOutput {
    }

    export class BorderRenderPipeDef extends core.render.RenderPipeDef {
        constructor () {
            super();
            this.addTapinBefore('doRender', 'calcShouldRender', tapins.calcShouldRender)
                .addTapinBefore('doRender', 'calcInnerOuter', tapins.calcInnerOuter)
                .replaceTapin('doRender', tapins.doRender);
        }

        createState (): IState {
            var state = <IState>super.createState();
            state.fillExtents = new Rect();
            state.innerCornerRadius = new CornerRadius();
            state.outerCornerRadius = new CornerRadius();
            return state;
        }
    }
}