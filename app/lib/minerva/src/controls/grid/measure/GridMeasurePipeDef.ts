module minerva.controls.grid.measure {
    export interface IInput extends panel.measure.IInput {
        gridState: IGridState;
        columnDefinitions: IColumnDefinition[];
        rowDefinitions: IRowDefinition[];
    }
    export interface IState extends panel.measure.IState {
        totalStars: Size;
        gridShape: GridShape;
        childShapes: GridChildShape[];
        childSize: Size;
        placements: GridChildPlacement[];
        placementIndex: number;
    }

    export class GridMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor () {
            super();
            this.addTapinBefore('doOverride', 'ensureRowMatrix', tapins.ensureRowMatrix)
                .addTapinBefore('doOverride', 'prepareRowMatrix', tapins.prepareRowMatrix)
                .addTapinBefore('doOverride', 'ensureColMatrix', tapins.ensureColMatrix)
                .addTapinBefore('doOverride', 'prepareColMatrix', tapins.prepareColMatrix)
                .addTapinBefore('doOverride', 'buildShape', tapins.buildShape)
                .addTapinBefore('doOverride', 'doOverrideAutoAuto', tapins.createDoOverridePass(OverridePass.AutoAuto))
                .addTapinBefore('doOverride', 'doOverrideStarAuto', tapins.createDoOverridePass(OverridePass.StarAuto))
                .addTapinBefore('doOverride', 'doOverrideAutoStar', tapins.createDoOverridePass(OverridePass.AutoStar))
                .addTapinBefore('doOverride', 'doOverrideStarAutoAgain', tapins.createDoOverridePass(OverridePass.StarAutoAgain))
                .addTapinBefore('doOverride', 'doOverrideNonStar', tapins.createDoOverridePass(OverridePass.NonStar))
                .addTapinBefore('doOverride', 'doOverrideRemainingStar', tapins.createDoOverridePass(OverridePass.RemainingStar))
                .replaceTapin('doOverride', tapins.doOverride)
                .addTapinAfter('doOverride', 'saveMeasureResults', tapins.saveMeasureResults);
        }

        createState () {
            var state = <IState>super.createState();
            state.totalStars = new Size();
            state.gridShape = new GridShape();
            state.childShapes = [];
            state.childSize = new Size();
            state.placements = [];
            state.placementIndex = 0;
            return state;
        }
    }
}