module minerva.controls.panel.measure {
    export interface IInput extends core.measure.IInput {
    }
    export interface IState extends core.measure.IState {
    }
    export interface IOutput extends core.measure.IOutput {
    }

    export class PanelMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', doOverride);
        }
    }

    function doOverride (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean {
        var desired = output.desiredSize;
        desired.width = desired.height = 0;
        for (var walker = tree.walk(); walker.step();) {
            walker.current.measure(state.availableSize);
            var childds = walker.current.assets.desiredSize;
            desired.width = Math.max(desired.width, childds.width);
            desired.height = Math.max(desired.height, childds.height);
        }
        return true;
    }
}