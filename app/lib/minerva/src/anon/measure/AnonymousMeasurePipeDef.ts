/// <reference path="../../core/measure/MeasurePipeDef" />

module minerva.anon.measure {
    export class AnonymousMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor (upd: AnonymousUpdater) {
            super();
            this.replaceTapin('doOverride', (input: core.measure.IInput, state: core.measure.IState, output: core.measure.IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean => {
                var availableSize = new Size();
                Size.copyTo(state.availableSize, availableSize);
                var val = upd.measureOverride(availableSize);
                Size.copyTo(val, output.desiredSize);
                return true;
            });
        }
    }
}