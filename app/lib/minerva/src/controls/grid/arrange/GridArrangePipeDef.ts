module minerva.controls.grid.arrange {
    export interface IInput extends panel.arrange.IInput {
        gridState: IGridState;
        columnDefinitions: IColumnDefinition[];
        rowDefinitions: IRowDefinition[];
    }
    export interface IState extends panel.arrange.IState {
        consumed: Size;
    }
    export interface IOutput extends panel.arrange.IOutput {
    }

    export class GridArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor () {
            super();
            this.addTapinBefore('doOverride', 'restoreMeasureResults', tapins.restoreMeasureResults)
                .addTapinBefore('doOverride', 'calcConsumed', tapins.calcConsumed)
                .addTapinBefore('doOverride', 'setActuals', tapins.setActuals)
                .replaceTapin('doOverride', tapins.doOverride);
        }

        createState () {
            var state = <IState>super.createState();
            state.consumed = new Size();
            return state;
        }
    }
}