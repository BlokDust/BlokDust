module minerva.shapes.path.hittest {
    export interface IHitTestData extends shape.hittest.IHitTestData {
        assets: IPathUpdaterAssets;
    }

    export class PathHitTestPipeDef extends shape.hittest.ShapeHitTestPipeDef {
        constructor () {
            super();
            this.replaceTapin('drawShape', tapins.drawShape);
        }
    }

    export module tapins {
        export function drawShape (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
            var assets = data.assets;
            ctx.preapply(assets.stretchXform);
            assets.data.Draw(ctx);
            return true;
        }
    }
}