module minerva.controls.image.arrange {
    export interface IInput extends core.arrange.IInput {
        source: IImageSource;
        stretch: Stretch;
    }
    export interface IState extends core.arrange.IState {
        imageBounds: Rect;
        stretchX: number;
        stretchY: number;
    }

    export class ImageArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor () {
            super();
            this.addTapinAfter('invalidateFuture', 'invalidateMetrics', tapins.invalidateMetrics)
                .addTapinBefore('doOverride', 'calcImageBounds', tapins.calcImageBounds)
                .addTapinBefore('doOverride', 'calcStretch', tapins.calcStretch)
                .replaceTapin('doOverride', tapins.doOverride);
        }

        createState () {
            var state = <IState>super.createState();
            state.imageBounds = new Rect();
            state.stretchX = 0;
            state.stretchY = 0;
            return state;
        }
    }
}
