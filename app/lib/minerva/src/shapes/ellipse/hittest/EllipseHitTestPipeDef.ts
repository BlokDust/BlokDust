/// <reference path="../../shape/hittest/ShapeHitTestPipeDef" />

module minerva.shapes.ellipse.hittest {
    export interface IHitTestData extends shape.hittest.IHitTestData {
        assets: IEllipseUpdaterAssets;
    }

    export class EllipseHitTestPipeDef extends shape.hittest.ShapeHitTestPipeDef {
        constructor () {
            super();
            this.replaceTapin('drawShape', tapins.drawShape);
        }
    }

    export module tapins {
        export function drawShape (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
            var sr = data.assets.shapeRect;
            helpers.draw(ctx.raw, sr.x, sr.y, sr.width, sr.height);
            return true;
        }
    }
}