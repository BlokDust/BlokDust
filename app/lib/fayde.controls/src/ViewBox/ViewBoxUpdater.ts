module Fayde.Controls.viewbox {
    export interface IViewboxUpdaterAssets extends minerva.core.IUpdaterAssets, processdown.IInput {
        stretch: Media.Stretch;
        stretchDirection: StretchDirection;
    }

    export class ViewboxUpdater extends minerva.anon.AnonymousUpdater {
        tree: minerva.core.UpdaterTree;
        assets: IViewboxUpdaterAssets;

        init () {
            this.setProcessDownPipe(minerva.singleton(processdown.ViewboxProcessDownPipeDef));

            var assets = this.assets;
            assets.stretch = Media.Stretch.Uniform;
            assets.stretchDirection = StretchDirection.Both;
            assets.viewXform = mat3.identity();

            super.init();
        }

        measureOverride (availableSize: Size): Size {
            var child = this.tree.subtree;
            if (!child)
                return new Size();

            child.measure(new Size(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY));

            var childSize = child.assets.desiredSize;
            var scalefac = helpers.computeScaleFactor(availableSize, childSize, this.assets.stretch, this.assets.stretchDirection);
            return new Size(scalefac.width * childSize.width, scalefac.height * childSize.height);
        }

        arrangeOverride (finalSize: Size): Size {
            var child = this.tree.subtree;
            if (!child)
                return new Size();

            var assets = this.assets;
            var childSize = child.assets.desiredSize;
            var scale = helpers.computeScaleFactor(finalSize, childSize, assets.stretch, assets.stretchDirection);

            child.arrange(new Rect(0, 0, childSize.width, childSize.height));

            this.setViewXform(scale.width, scale.height);

            return new Size(scale.width * childSize.width, scale.height * childSize.height);
        }

        private setViewXform (sx: number, sy: number) {
            var assets = this.assets;
            var xform = mat3.createScale(sx, sy);
            if (!mat3.equal(assets.viewXform, xform)) {
                mat3.copyTo(xform, assets.viewXform);
                assets.dirtyFlags |= minerva.DirtyFlags.Transform;
            }
        }
    }
}