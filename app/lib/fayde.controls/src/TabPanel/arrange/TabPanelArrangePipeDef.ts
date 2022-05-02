module Fayde.Controls.tabpanel.arrange {
    import panel = minerva.controls.panel;
    export interface IInput extends panel.arrange.IInput {
        tabAlignment: Dock;
        numRows: number;
        numHeaders: number;
        rowHeight: number;
    }
    export interface IState extends panel.arrange.IState {
    }
    export interface IOutput extends panel.arrange.IOutput {
    }
    export class TabPanelArrangePipeDef extends minerva.controls.panel.arrange.PanelArrangePipeDef {
        constructor () {
            super();
            this.addTapinAfter('doOverride', 'doVertical', tapins.doVertical)
                .addTapinAfter('doVertical', 'doHorizontal', tapins.doHorizontal)
                .removeTapin('doOverride');
        }
    }
}