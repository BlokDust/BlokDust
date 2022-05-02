module minerva.controls.scrollcontentpresenter.measure {
    export interface IInput extends core.measure.IInput {
        scrollData: IScrollData;
    }
    export interface IState extends core.measure.IState {
        idealSize: Size;
    }

    export class ScrollContentPresenterMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride)
                .addTapinAfter('doOverride', 'updateExtents', tapins.updateExtents)
                .addTapinAfter('updateExtents', 'finishDoOverride', tapins.finishDoOverride);
        }

        createState (): IState {
            var state = <IState>super.createState();
            state.idealSize = new Size();
            return state;
        }
    }
}