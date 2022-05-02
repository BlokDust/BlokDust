module minerva.core {
    export interface IVisualOwner {
        updateBounds();
        invalidate(region: Rect);
    }
    var NO_VO: IVisualOwner = {
        updateBounds: function () {
        },
        invalidate: function (region: Rect) {
        }
    };

    export interface IUpdaterTree {
        isTop: boolean;
        surface: ISurface;
        visualParent: Updater;
        visualOwner: IVisualOwner;
        isContainer: boolean;
        isLayoutContainer: boolean;
        walk(direction?: WalkDirection): IWalker<Updater>;
        onChildAttached(child: Updater);
        onChildDetached(child: Updater);
        applyTemplate (): boolean;
        setTemplateApplier(applier: () => boolean);
    }
    export class UpdaterTree implements IUpdaterTree {
        isTop = false;
        surface = null;
        visualParent = null;
        isContainer = false;
        isLayoutContainer = false;
        subtree = null;

        get visualOwner (): IVisualOwner {
            if (this.visualParent)
                return this.visualParent;
            if (this.isTop && this.surface)
                return this.surface;
            return NO_VO;
        }

        walk (direction?: WalkDirection): IWalker<Updater> {
            var visited = false;
            var _this = this;
            return {
                current: undefined,
                step: function (): boolean {
                    if (visited)
                        return false;
                    visited = true;
                    this.current = _this.subtree;
                    return this.current != null;
                }
            };
        }

        onChildAttached (child: core.Updater) {
            this.subtree = child;
        }

        onChildDetached (child: core.Updater) {
            this.subtree = null;
        }

        setTemplateApplier (applier: () => boolean) {
            this.applyTemplate = applier;
        }

        applyTemplate (): boolean {
            return false;
        }
    }
}