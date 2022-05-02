module minerva.controls.stackpanel.measure {
    export interface IInput extends panel.measure.IInput {
        orientation: Orientation;
    }
    export interface IState extends panel.measure.IState {
        childAvailable: Size;
    }
    export interface IOutput extends panel.measure.IOutput {
    }

    export class StackPanelMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor () {
            super();
            this.replaceTapin('doOverride', tapins.doOverride)
                .addTapinAfter('doOverride', 'doHorizontal', tapins.doHorizontal)
                .addTapinAfter('doOverride', 'doVertical', tapins.doVertical);
        }

        createState (): IState {
            var state = <IState>super.createState();
            state.childAvailable = new Size();
            return state;
        }
    }
}