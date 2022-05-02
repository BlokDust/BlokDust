module minerva.core.hittest {
    export interface IHitTestTapin {
        (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
    }
    export interface IHitTestData {
        assets: IUpdaterAssets;
        tree: IUpdaterTree;
        updater: Updater;
        hitChildren: boolean;
        bounds: Rect;
        layoutClipBounds: Rect;
    }

    export class HitTestPipeDef extends pipe.PipeDef<IHitTestTapin, IHitTestData> {
        constructor () {
            super();
            this.addTapin('canHit', tapins.canHit)
                .addTapin('prepareCtx', tapins.prepareCtx)
                .addTapin('insideClip', tapins.insideClip)
                .addTapin('insideChildren', tapins.insideChildren)
                .addTapin('canHitInside', tapins.canHitInside)
                .addTapin('insideObject', tapins.insideObject)
                .addTapin('insideLayoutClip', tapins.insideLayoutClip)
                .addTapin('completeCtx', tapins.completeCtx);
        }
    }
}