/// <reference path="../../../core/measure/MeasurePipeDef" />

module minerva.controls.border.measure {
    export interface IInput extends core.measure.IInput {
        padding: Thickness;
        borderThickness: Thickness;
    }
    export interface IState extends core.measure.IState {
        totalBorder: Thickness;
    }
    export interface IOutput extends core.measure.IOutput {
    }

    export class BorderMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor () {
            super();
            this.addTapinBefore('doOverride', 'preOverride', preOverride)
                .replaceTapin('doOverride', doOverride)
                .addTapinAfter('doOverride', 'postOverride', postOverride);
        }

        createState (): IState {
            var state = <IState>super.createState();
            state.totalBorder = new Thickness();
            return state;
        }
    }

    export function preOverride (input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, availableSize: Size): boolean {
        var tb = state.totalBorder;
        Thickness.copyTo(input.padding, tb);
        Thickness.add(tb, input.borderThickness);
        Thickness.shrinkSize(tb, state.availableSize);
        return true;
    }

    export function doOverride (input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, availableSize: Size): boolean {
        var ds = output.desiredSize;
        if (tree.subtree) {
            tree.subtree.measure(state.availableSize);
            Size.copyTo(tree.subtree.assets.desiredSize, ds);
        }
        return true;
    }

    export function postOverride (input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, availableSize: Size): boolean {
        Thickness.growSize(state.totalBorder, output.desiredSize);
        Size.min(output.desiredSize, state.availableSize);
        return true;
    }
}