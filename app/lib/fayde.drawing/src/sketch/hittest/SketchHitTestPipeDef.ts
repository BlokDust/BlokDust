module Fayde.Drawing.sketch.hittest {
    export class SketchHitTestPipeDef extends minerva.core.hittest.HitTestPipeDef {
        constructor() {
            super();
            this.removeTapin('canHitInside');
        }
    }
}