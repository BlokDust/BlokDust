module minerva.controls.usercontrol.measure {
    export interface IInput extends core.measure.IInput {
        padding: Thickness;
        borderThickness: Thickness;
    }
    export interface IState extends core.measure.IState {
        totalBorder: Thickness;
    }

    export class UserControlMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor () {
            super();
            this.addTapinBefore('doOverride', 'preOverride', tapins.preOverride)
                .replaceTapin('doOverride', tapins.doOverride)
                .addTapinAfter('doOverride', 'postOverride', tapins.postOverride);
        }

        createState (): IState {
            var state = <IState>super.createState();
            state.totalBorder = new Thickness();
            return state;
        }
    }
}
