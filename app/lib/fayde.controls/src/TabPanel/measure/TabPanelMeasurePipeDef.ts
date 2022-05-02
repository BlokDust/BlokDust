module Fayde.Controls.tabpanel.measure {
    import panel = minerva.controls.panel;
    export interface IInput extends panel.measure.IInput {
        tabAlignment: Dock;
        numRows: number;
        numHeaders: number;
        rowHeight: number;
    }
    export interface IState extends panel.measure.IState {
    }
    export interface IOutput extends panel.measure.IOutput {
        numRows: number;
        numHeaders: number;
        rowHeight: number;
    }
    export class TabPanelMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor () {
            super();
            this.addTapinAfter('doOverride', 'doVertical', tapins.doVertical)
                .addTapinAfter('doVertical', 'doHorizontal', tapins.doHorizontal)
                .removeTapin('doOverride');
        }

        createOutput () {
            var output = <IOutput>super.createOutput();
            output.numRows = 1;
            output.numHeaders = 0;
            output.rowHeight = 0.0;
            return output;
        }

        prepare (input: IInput, state: IState, output: IOutput) {
            output.numRows = input.numRows;
            output.numHeaders = input.numHeaders;
            output.rowHeight = input.rowHeight;
            super.prepare(input, state, output);
        }

        flush (input: IInput, state: IState, output: IOutput) {
            super.flush(input, state, output);
            input.numRows = output.numRows;
            input.numHeaders = output.numHeaders;
            input.rowHeight = output.rowHeight;
        }
    }
}