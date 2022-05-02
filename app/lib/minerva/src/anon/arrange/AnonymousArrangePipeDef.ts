/// <reference path="../../core/arrange/ArrangePipeDef" />

module minerva.anon.arrange {
    export class AnonymousArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor (upd: AnonymousUpdater) {
            super();
            this.replaceTapin('doOverride', (input: core.arrange.IInput, state: core.arrange.IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean => {
                var finalSize = new Size();
                Size.copyTo(state.finalSize, finalSize);
                var val = upd.arrangeOverride(finalSize);
                Size.copyTo(val, state.arrangedSize);
                return true;
            });
        }
    }
}