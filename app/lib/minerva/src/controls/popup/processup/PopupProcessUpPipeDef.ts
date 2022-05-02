module minerva.controls.popup.processup {
    export class PopupProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor() {
            super();
            this.removeTapin('calcActualSize')
                .removeTapin('calcExtents')
                .removeTapin('calcPaintBounds');
        }
    }
}