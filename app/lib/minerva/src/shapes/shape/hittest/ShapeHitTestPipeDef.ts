module minerva.shapes.shape.hittest {
    export interface IHitTestData extends core.hittest.IHitTestData {
        assets: IShapeUpdaterAssets;
    }

    export class ShapeHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor () {
            super();
            this.replaceTapin('canHitInside', tapins.canHitInside)
                .replaceTapin('insideChildren', tapins.insideChildren)
                .addTapinAfter('insideObject', 'canHitShape', tapins.canHitShape)
                .addTapinAfter('canHitShape', 'prepareShape', tapins.prepareShape)
                .addTapinAfter('prepareShape', 'drawShape', tapins.drawShape)
                .addTapinAfter('drawShape', 'finishShape', tapins.finishShape);
        }
    }
}