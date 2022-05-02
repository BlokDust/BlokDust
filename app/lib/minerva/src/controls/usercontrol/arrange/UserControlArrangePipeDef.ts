module minerva.controls.usercontrol.arrange {
    export interface IInput extends core.arrange.IInput {
        padding: Thickness;
        borderThickness: Thickness;
    }
    export interface IState extends core.arrange.IState {
        totalBorder: Thickness;
    }

    export class UserControlArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor () {
            super();
            this.addTapinBefore('doOverride', 'preOverride', tapins.preOverride)
                .replaceTapin('doOverride', tapins.doOverride);
        }

        createState (): IState {
            var state = <IState>super.createState();
            state.totalBorder = new Thickness();
            return state;
        }
    }
}
