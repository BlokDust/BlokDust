module minerva.controls.popup.hittest {
    export interface IHitTestData extends core.hittest.IHitTestData {
        assets: IPopupUpdaterAssets;
    }

    export class PopupHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor () {
            super();
            this.addTapinBefore('canHit', 'shouldSkip', tapins.shouldSkip);
        }
    }

    export module tapins {
        export function shouldSkip (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
            return !!data.assets.isVisible;
        }
    }
}