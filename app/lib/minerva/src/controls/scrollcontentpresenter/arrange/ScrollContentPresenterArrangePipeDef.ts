module minerva.controls.scrollcontentpresenter.arrange {
    export interface IInput extends core.arrange.IInput {
        scrollData: IScrollData;
        desiredSize: Size;
        internalClip: Rect;
    }
    export interface IState extends core.arrange.IState {
    }
    export interface IOutput extends core.arrange.IOutput {
        internalClip: Rect;
    }

    export class ScrollContentPresenterArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride)
                .addTapinAfter('completeOverride', 'updateClip', tapins.updateClip)
                .addTapinAfter('updateClip', 'updateExtents', tapins.updateExtents);
        }

        createOutput (): IOutput {
            var output = <IOutput>super.createOutput();
            output.internalClip = new Rect();
            return output;
        }

        prepare (input: IInput, state: IState, output: IOutput) {
            Rect.copyTo(input.internalClip, output.internalClip);
            super.prepare(input, state, output);
        }

        flush (input: IInput, state: IState, output: IOutput) {
            super.flush(input, state, output);
            Rect.copyTo(output.internalClip, input.internalClip);
        }
    }
}