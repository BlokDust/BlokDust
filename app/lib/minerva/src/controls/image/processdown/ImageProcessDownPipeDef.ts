module minerva.controls.image.processdown {
    export interface IInput extends core.processdown.IInput, core.helpers.ISized {
        source: IImageSource;
        stretch: Stretch;
        imgXform: number[];
        overlap: RectOverlap;
        renderSize: Size;
    }
    export interface IState extends core.processdown.IState {
        imgRect: Rect;
        paintRect: Rect;
        calcImageMetrics: boolean;
        imgAdjust: boolean; //TODO: This may be overkill, requires more investigation
    }
    export interface IOutput extends core.processdown.IOutput {
        imgXform: number[];
        overlap: RectOverlap;
    }

    export class ImageProcessDownPipeDef extends core.processdown.ProcessDownPipeDef {
        constructor () {
            super();
            //TODO: Should we merge the overlap into the layout clip for render?
            this.addTapinBefore('processLayoutClip', 'checkNeedImageMetrics', tapins.checkNeedImageMetrics)
                .addTapinAfter('checkNeedImageMetrics', 'prepareImageMetrics', tapins.prepareImageMetrics)
                .addTapinAfter('prepareImageMetrics', 'calcImageTransform', tapins.calcImageTransform)
                .addTapinAfter('calcImageTransform', 'calcOverlap', tapins.calcOverlap);
        }

        createState () {
            var state = <IState>super.createState();
            state.imgRect = new Rect();
            state.paintRect = new Rect();
            state.calcImageMetrics = false;
            state.imgAdjust = false;
            return state;
        }

        createOutput () {
            var output = <IOutput>super.createOutput();
            output.imgXform = mat3.identity();
            output.overlap = RectOverlap.In;
            return output;
        }

        prepare (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree) {
            super.prepare(input, state, output, vpinput, tree);
            output.overlap = input.overlap;
            mat3.copyTo(input.imgXform, output.imgXform);
        }

        flush (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree) {
            super.flush(input, state, output, vpinput, tree);
            input.overlap = output.overlap;
            mat3.copyTo(output.imgXform, input.imgXform);
        }
    }
}