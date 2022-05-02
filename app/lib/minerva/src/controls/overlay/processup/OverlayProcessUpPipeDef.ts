module minerva.controls.overlay.processup {
    export class OverlayProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor () {
            super();
            this.removeTapin('calcActualSize')
                .removeTapin('calcExtents')
                .removeTapin('calcPaintBounds');
        }
    }
}