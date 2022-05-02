module minerva.controls.popup.processdown {
    export interface IInput extends core.processdown.IInput {
        horizontalOffset: number;
        verticalOffset: number;
    }

    export class PopupProcessDownPipeDef extends core.processdown.ProcessDownPipeDef {
        constructor () {
            super();
            this.addTapinBefore('processXform', 'preProcessXform', tapins.preProcessXform)
                .addTapinAfter('processXform', 'postProcessXform', tapins.postProcessXform);
        }
    }
}