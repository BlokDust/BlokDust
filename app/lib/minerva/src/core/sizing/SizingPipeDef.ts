module minerva.core.sizing {
    export interface ISizingTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree):boolean;
    }
    export interface IInput extends pipe.IPipeInput, helpers.ISized {
        visibility: Visibility;
        renderSize: Size;
        actualWidth: number;
        actualHeight: number;
    }
    export interface IState extends pipe.IPipeState {
        useRender: boolean;
    }
    export interface IOutput extends pipe.IPipeOutput {
        actualSize: Size;
    }

    export class SizingPipeDef extends pipe.TriPipeDef<ISizingTapin, IInput, IState, IOutput> {
        constructor () {
            super();
            this.addTapin('calcUseRender', tapins.calcUseRender)
                .addTapin('computeActual', tapins.computeActual);
        }

        createState (): IState {
            return {
                useRender: false
            };
        }

        createOutput (): IOutput {
            return {
                actualSize: new Size()
            };
        }

        prepare (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree) {
        }

        flush (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree) {
            var as = output.actualSize;
            input.actualWidth = as.width;
            input.actualHeight = as.height;
        }
    }
}