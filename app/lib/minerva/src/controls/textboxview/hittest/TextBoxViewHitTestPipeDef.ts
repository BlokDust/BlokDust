module minerva.controls.textboxview.hittest {
    export interface IHitTestData extends core.hittest.IHitTestData {
        assets: ITextBoxViewUpdaterAssets;
    }

    export class TextBoxViewHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor () {
            super();
            this.replaceTapin('canHitInside', tapins.canHitInside);
        }
    }

    export module tapins {
        export function canHitInside (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
            return true;
        }
    }
}