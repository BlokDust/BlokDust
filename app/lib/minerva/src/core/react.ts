module minerva.core.reactTo {
    export module helpers {
        export function invalidateParent(updater: Updater) {
            updater.tree.visualOwner.invalidate(updater.assets.surfaceBoundsWithChildren);
        }

        export function sizeChanged(updater: Updater) {
            var vp = updater.tree.visualParent;
            if (vp)
                vp.invalidateMeasure();
            var origin = updater.assets.renderTransformOrigin;
            updater.fullInvalidate(origin.x !== 0.0 || origin.y !== 0)
                .invalidateMeasure()
                .invalidateArrange();
        }

        export function alignmentChanged(updater: Updater) {
            updater.invalidateArrange();
            updater.fullInvalidate(true);
        }
    }

    /// UI ELEMENT

    export function isHitTestVisible(updater: Updater, oldValue: boolean, newValue: boolean) {
        updater.assets.dirtyFlags |= DirtyFlags.HitTestVisibility;
        Updater.$$addDownDirty(updater);
    }

    export function useLayoutRounding(updater: Updater, oldValue: boolean, newValue: boolean) {
        updater.invalidateMeasure();
        updater.invalidateArrange();
    }

    export function opacity(updater: Updater, oldValue: number, newValue: number) {
        updater.assets.dirtyFlags |= DirtyFlags.RenderVisibility;
        Updater.$$addDownDirty(updater);
        helpers.invalidateParent(updater);
    }

    export function visibility(updater: Updater, oldValue: Visibility, newValue: Visibility) {
        updater.assets.dirtyFlags |= DirtyFlags.RenderVisibility;
        Updater.$$addDownDirty(updater);
        helpers.invalidateParent(updater);

        updater.invalidateMeasure();
        var vp = updater.tree.visualParent;
        if (vp)
            vp.invalidateMeasure(); //TODO: Can we get rid of this?
    }

    export function effect(updater: Updater, oldValue: IEffect, newValue: IEffect) {
        helpers.invalidateParent(updater);
        var changed = (newValue) ? newValue.GetPadding(updater.assets.effectPadding) : false;
        if (changed)
            updater.updateBounds();

        //TODO: This if statement looks stupid
        if (oldValue !== newValue && updater.tree.surface) {
            updater.assets.dirtyFlags |= DirtyFlags.LocalTransform;
            Updater.$$addDownDirty(updater);
        }
    }

    export function clip(updater: Updater, oldValue: IGeometry, newValue: IGeometry) {
        var assets = updater.assets;
        /*
         TODO: Should we reincorporate ClipBounds?
         var cb = assets.clipBounds;
         if (!newValue)
         cb.x = cb.y = cb.width = cb.height = 0;
         else
         Rect.copyTo(newValue.GetBounds(), cb);
         */
        helpers.invalidateParent(updater);
        updater.updateBounds(true);
        assets.dirtyFlags |= DirtyFlags.LocalClip;
        Updater.$$addDownDirty(updater);
    }

    export function renderTransform(updater: Updater, oldValue: any, newValue: any) {
        updater.assets.dirtyFlags |= DirtyFlags.LocalTransform;
        Updater.$$addDownDirty(updater);
    }

    export function renderTransformOrigin(updater: Updater, oldValue: Point, newValue: Point) {
        updater.assets.dirtyFlags |= DirtyFlags.LocalTransform;
        Updater.$$addDownDirty(updater);
    }

    /// FRAMEWORK ELEMENT
    export var width = helpers.sizeChanged;
    export var height = helpers.sizeChanged;
    export var minWidth = helpers.sizeChanged;
    export var minHeight = helpers.sizeChanged;
    export var maxWidth = helpers.sizeChanged;
    export var maxHeight = helpers.sizeChanged;
    export var margin = helpers.sizeChanged;
    export var flowDirection = helpers.sizeChanged;

    export var horizontalAlignment = helpers.alignmentChanged;
    export var verticalAlignment = helpers.alignmentChanged;
}