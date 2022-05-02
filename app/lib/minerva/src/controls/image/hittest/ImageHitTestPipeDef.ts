module minerva.controls.image.hittest {
    export interface IHitTestData extends core.hittest.IHitTestData {
        assets: IImageUpdaterAssets;
        imgRect: Rect;
    }

    export class ImageHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor () {
            super();
            this.replaceTapin('insideChildren', tapins.insideChildren)
                .replaceTapin('canHitInside', tapins.canHitInside)
                .addTapinAfter('insideObject', 'insideStretch', tapins.insideStretch);
        }

        prepare (data: IHitTestData) {
            data.imgRect = data.imgRect || new Rect();
        }
    }
}