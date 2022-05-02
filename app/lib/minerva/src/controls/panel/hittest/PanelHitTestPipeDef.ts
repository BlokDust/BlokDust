module minerva.controls.panel.hittest {
    export interface IHitTestData extends core.hittest.IHitTestData {
        assets: IPanelUpdaterAssets;
    }

    export class PanelHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor () {
            super();
            this.replaceTapin('canHitInside', tapins.canHitInside);
        }
    }

    export module tapins {
        export function canHitInside (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
            if (data.hitChildren)
                return true;

            if (!data.assets.background) {
                hitList.shift();
                ctx.restore();
                return false;
            }
            return true;
        }
    }
}