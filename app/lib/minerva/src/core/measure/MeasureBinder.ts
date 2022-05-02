module minerva.core.measure {
    export interface IMeasureBinder {
        bind(updater: Updater): boolean;
    }
    export class MeasureBinder implements IMeasureBinder {
        bind (updater: Updater): boolean {
            var assets = updater.assets;
            var last = assets.previousConstraint;
            var old = new Size();
            var tree = updater.tree;

            if (!tree.surface && Size.isUndef(last) && !tree.visualParent && tree.isLayoutContainer)
                last.width = last.height = Number.POSITIVE_INFINITY;

            var success = false;
            if (!Size.isUndef(last)) {
                Size.copyTo(assets.desiredSize, old);
                success = updater.measure(last);
                if (Size.isEqual(old, assets.desiredSize))
                    return success;
            }

            if (tree.visualParent)
                tree.visualParent.invalidateMeasure();

            assets.dirtyFlags &= ~DirtyFlags.Measure;
            return success;
        }
    }
}