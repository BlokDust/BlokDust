module minerva.controls.overlay.hittest {
    export interface IHitTestData extends core.hittest.IHitTestData {
        assets: IOverlayUpdaterAssets;
    }

    export class OverlayHitTestPipeDef extends core.hittest.HitTestPipeDef {
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