/// <reference path="../../shape/hittest/ShapeHitTestPipeDef" />

module minerva.shapes.rectangle.hittest {
    export interface IHitTestData extends shape.hittest.IHitTestData {
        assets: IRectangleUpdaterAssets;
    }

    export class RectangleHitTestPipeDef extends shape.hittest.ShapeHitTestPipeDef {
        constructor () {
            super();
            this.replaceTapin('drawShape', tapins.drawShape);
        }
    }

    export module tapins {
        export function drawShape (data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean {
            var assets = data.assets;
            var sr = assets.shapeRect;
            var rx = Math.min(Math.abs(assets.radiusX), sr.width / 2.0);
            if (isNaN(rx))
                rx = 0;
            var ry = Math.min(Math.abs(assets.radiusY), sr.height / 2.0);
            if (isNaN(ry))
                ry = 0;

            helpers.draw(ctx.raw, sr.x, sr.y, sr.width, sr.height, rx, ry);

            return true;
        }
    }
}