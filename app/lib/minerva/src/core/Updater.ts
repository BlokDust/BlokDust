module minerva.core {
    export class Updater {
        private $$measure: IMeasurePipe = null;
        private $$measureBinder: measure.IMeasureBinder = null;
        private $$arrange: IArrangePipe = null;
        private $$arrangeBinder: arrange.IArrangeBinder = null;
        private $$sizing: ISizingPipe = null;
        private $$processdown: IProcessDownPipe = null;
        private $$processup: IProcessUpPipe = null;
        private $$render: IRenderPipe = null;
        private $$hittest: IHitTestPipe = null;

        private $$inDownDirty = false;
        private $$inUpDirty = false;

        private $$attached = {};

        private $$sizeupdater: ISizeUpdater = NO_SIZE_UPDATER;

        assets: IUpdaterAssets = {
            width: NaN,
            height: NaN,
            minWidth: 0.0,
            minHeight: 0.0,
            maxWidth: Number.POSITIVE_INFINITY,
            maxHeight: Number.POSITIVE_INFINITY,
            useLayoutRounding: true,
            margin: new Thickness(),
            horizontalAlignment: HorizontalAlignment.Stretch,
            verticalAlignment: VerticalAlignment.Stretch,
            clip: null,
            effect: null,
            visibility: Visibility.Visible,
            opacity: 1.0,
            isHitTestVisible: true,
            renderTransform: null,
            renderTransformOrigin: new Point(),
            effectPadding: new Thickness(),

            previousConstraint: new Size(),
            desiredSize: new Size(),
            hiddenDesire: new Size(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY),

            renderSize: new Size(),
            visualOffset: new Point(),
            lastRenderSize: undefined,
            layoutSlot: new Rect(),
            layoutClip: new Rect(),
            compositeLayoutClip: new Rect(),
            breakLayoutClip: false,

            actualWidth: 0,
            actualHeight: 0,
            z: NaN,

            totalIsRenderVisible: true,
            totalOpacity: 1.0,
            totalIsHitTestVisible: true,

            extents: new Rect(),
            extentsWithChildren: new Rect(),
            surfaceBoundsWithChildren: new Rect(),
            globalBoundsWithChildren: new Rect(),

            layoutXform: mat3.identity(),
            carrierXform: null,
            renderXform: mat3.identity(),
            absoluteXform: mat3.identity(),

            dirtyRegion: new Rect(),
            dirtyFlags: 0,
            uiFlags: UIFlags.RenderVisible | UIFlags.HitTestVisible,
            forceInvalidate: false
        };

        tree: IUpdaterTree = null;

        constructor () {
            perfex.timer.start("CreateUpdater", null);
            this.setMeasureBinder()
                .setArrangeBinder()
                .init();
            perfex.timer.stop();
        }

        init () {
            this.setTree(this.tree);
            if (!this.$$measure)
                this.setMeasurePipe();
            if (!this.$$arrange)
                this.setArrangePipe();
            if (!this.$$sizing)
                this.setSizingPipe();
            if (!this.$$processdown)
                this.setProcessDownPipe();
            if (!this.$$processup)
                this.setProcessUpPipe();
            if (!this.$$render)
                this.setRenderPipe();
            if (!this.$$hittest)
                this.setHitTestPipe();
            if (!this.$$hittest.data.tree)
                this.$$hittest.data.tree = this.tree;
        }

        setTree (tree?: IUpdaterTree): Updater {
            this.tree = tree || <IUpdaterTree>new UpdaterTree();
            return this;
        }

        getAttachedValue (name: string): any {
            return this.$$attached[name];
        }

        setAttachedValue (name: string, value?: any) {
            this.$$attached[name] = value;
        }

        /////// TREE

        onDetached () {
            reactTo.helpers.invalidateParent(this);
            this.invalidateMeasure();
            if (this.tree.visualParent)
                this.tree.visualParent.invalidateMeasure();

            var ls = this.assets.layoutSlot;
            ls.x = ls.y = ls.width = ls.height = 0;
            var lc = this.assets.layoutClip;
            lc.x = lc.y = lc.width = lc.height = 0;
        }

        onAttached () {
            var assets = this.assets;
            Size.undef(assets.previousConstraint);
            assets.dirtyFlags |= (DirtyFlags.RenderVisibility | DirtyFlags.HitTestVisibility | DirtyFlags.LocalTransform);
            var lc = assets.layoutClip;
            lc.x = lc.y = lc.width = lc.height = 0;
            var rs = assets.renderSize;
            rs.width = rs.height = 0;
            this.invalidateMeasure()
                .invalidateArrange()
                .invalidate()
                .updateBounds(true);
            Updater.$$addDownDirty(this);
            if ((assets.uiFlags & UIFlags.SizeHint) > 0 || assets.lastRenderSize !== undefined)
                Updater.$$propagateUiFlagsUp(this, UIFlags.SizeHint);
        }

        setVisualParent (visualParent: Updater): Updater {
            if (!visualParent && this.tree.visualParent) {
                this.onDetached();
                this.tree.visualParent.tree.onChildDetached(this);
            }
            this.tree.visualParent = visualParent;
            this.setSurface(visualParent ? visualParent.tree.surface : undefined);
            if (visualParent) {
                visualParent.tree.onChildAttached(this);
                this.onAttached();
            }
            return this;
        }

        setSurface (surface: ISurface): Updater {
            var cur: core.Updater;
            var newUps: core.Updater[] = [];
            for (var walker = this.walkDeep(); walker.step();) {
                cur = walker.current;
                if (cur.tree.surface === surface) {
                    walker.skipBranch();
                    continue;
                }
                var olds = cur.tree.surface;
                cur.tree.surface = surface;
                cur.onSurfaceChanged(olds, surface);
                if (surface) {
                    if ((cur.assets.dirtyFlags & DirtyFlags.DownDirtyState) > 0) {
                        cur.$$inDownDirty = true;
                        surface.addDownDirty(cur);
                    }
                    if ((cur.assets.dirtyFlags & DirtyFlags.UpDirtyState) > 0)
                        newUps.push(cur);
                }
            }
            //NOTE: Adding Updaters to surface in reverse deep walk order for process up pass
            while ((cur = newUps.pop()) != null) {
                cur.$$inUpDirty = true;
                surface.addUpDirty(cur);
            }
            return this;
        }

        onSurfaceChanged (oldSurface: ISurface, newSurface: ISurface) {
        }

        walkDeep (dir?: WalkDirection): IDeepWalker<Updater> {
            var last: Updater = undefined;
            var walkList: Updater[] = [this];
            dir = dir || WalkDirection.Forward;
            var revdir = (dir === WalkDirection.Forward || dir === WalkDirection.ZForward) ? dir + 1 : dir - 1;

            return {
                current: undefined,
                step: function (): boolean {
                    if (last) {
                        for (var subwalker = last.tree.walk(revdir); subwalker.step();) {
                            walkList.unshift(subwalker.current);
                        }
                    }

                    this.current = last = walkList.shift();
                    return this.current !== undefined;
                },
                skipBranch: function () {
                    last = undefined;
                }
            };
        }

        /////// PREPARE PIPES

        setMeasurePipe (pipedef?: measure.MeasurePipeDef): Updater {
            if (this.$$measure)
                return this;
            var def = pipedef || new measure.MeasurePipeDef();
            this.$$measure = <IMeasurePipe>pipe.createTriPipe(def);
            return this;
        }

        setMeasureBinder (mb?: measure.IMeasureBinder): Updater {
            this.$$measureBinder = mb || new measure.MeasureBinder();
            return this;
        }

        setArrangePipe (pipedef?: arrange.ArrangePipeDef): Updater {
            if (this.$$arrange)
                return this;
            var def = pipedef || new arrange.ArrangePipeDef();
            this.$$arrange = <IArrangePipe>pipe.createTriPipe(def);
            return this;
        }

        setArrangeBinder (ab?: arrange.IArrangeBinder): Updater {
            this.$$arrangeBinder = ab || new arrange.ArrangeBinder();
            return this;
        }

        setSizingPipe (pipedef?: sizing.SizingPipeDef): Updater {
            if (this.$$sizing)
                return this;
            var def: pipe.TriPipeDef<sizing.ISizingTapin, sizing.IInput, sizing.IState, sizing.IOutput> = pipedef;
            if (!def)
                def = new sizing.SizingPipeDef();
            this.$$sizing = <ISizingPipe>pipe.createTriPipe(def);
            return this;
        }

        setProcessDownPipe (pipedef?: processdown.ProcessDownPipeDef): Updater {
            var def: pipe.TriPipeDef<processdown.IProcessDownTapin, processdown.IInput, processdown.IState, processdown.IOutput> = pipedef;
            if (!def)
                def = new processdown.ProcessDownPipeDef();
            this.$$processdown = <IProcessDownPipe>pipe.createTriPipe(def);
            return this;
        }

        setProcessUpPipe (pipedef?: processup.ProcessUpPipeDef): Updater {
            if (this.$$processup)
                return this;
            var def: pipe.TriPipeDef<processup.IProcessUpTapin, processup.IInput, processup.IState, processup.IOutput> = pipedef;
            if (!def)
                def = new processup.ProcessUpPipeDef();
            this.$$processup = <IProcessUpPipe>pipe.createTriPipe(def);
            return this;
        }

        setRenderPipe (pipedef?: render.RenderPipeDef): Updater {
            if (this.$$render)
                return this;
            var def = pipedef || new render.RenderPipeDef();
            this.$$render = <IRenderPipe>pipe.createTriPipe(def);
            return this;
        }

        setHitTestPipe (pipedef?: hittest.HitTestPipeDef) {
            if (this.$$hittest)
                return this;
            var def = pipedef || new hittest.HitTestPipeDef();
            this.$$hittest = {
                def: def,
                data: {
                    updater: this,
                    assets: this.assets,
                    tree: this.tree,
                    hitChildren: false,
                    bounds: new Rect(),
                    layoutClipBounds: new Rect()
                }
            };
            return this;
        }

        /////// RUN PIPES

        doMeasure () {
            this.$$measureBinder.bind(this);
        }

        measure (availableSize: Size): boolean {
            var pipe = this.$$measure;
            var output = pipe.output;
            var success = pipe.def.run(this.assets, pipe.state, output, this.tree, availableSize);
            if (output.newUpDirty)
                Updater.$$addUpDirty(this);
            if (output.newDownDirty)
                Updater.$$addDownDirty(this);
            if (output.newUiFlags)
                Updater.$$propagateUiFlagsUp(this, output.newUiFlags);
            return success;
        }

        doArrange () {
            this.$$arrangeBinder.bind(this);
        }

        arrange (finalRect: Rect): boolean {
            var pipe = this.$$arrange;
            var output = pipe.output;
            var success = pipe.def.run(this.assets, pipe.state, output, this.tree, finalRect);
            if (output.newUpDirty)
                Updater.$$addUpDirty(this);
            if (output.newDownDirty)
                Updater.$$addDownDirty(this);
            if (output.newUiFlags)
                Updater.$$propagateUiFlagsUp(this, output.newUiFlags);
            return success;
        }

        sizing (oldSize: Size, newSize: Size): boolean {
            var pipe = this.$$sizing;
            var assets = this.assets;
            if (assets.lastRenderSize)
                Size.copyTo(assets.lastRenderSize, oldSize);
            var success = pipe.def.run(assets, pipe.state, pipe.output, this.tree);
            Size.copyTo(pipe.output.actualSize, newSize);
            this.$$sizeupdater.setActualWidth(newSize.width);
            this.$$sizeupdater.setActualHeight(newSize.height);
            assets.lastRenderSize = undefined;
            return success;
        }

        processDown (): boolean {
            if (!this.tree.surface)
                this.$$inDownDirty = false;
            if (!this.$$inDownDirty)
                return true;
            var vp = this.tree.visualParent;
            if (vp && vp.$$inDownDirty) {
                //OPTIMIZATION: uie is overzealous. His parent will invalidate him later
                return false;
            }

            var pipe = this.$$processdown;
            var success = pipe.def.run(this.assets, pipe.state, pipe.output, vp ? vp.assets : null, this.tree);
            this.$$inDownDirty = false;
            if (pipe.output.newUpDirty)
                Updater.$$addUpDirty(this);
            return success;
        }

        processUp (): boolean {
            if (!this.tree.surface)
                this.$$inUpDirty = false;
            if (!this.$$inUpDirty)
                return true;

            var pipe = this.$$processup;
            var success = pipe.def.run(this.assets, pipe.state, pipe.output, this.tree);
            this.$$inUpDirty = false;
            return success;
        }

        render (ctx: render.RenderContext, region: Rect): boolean {
            var pipe = this.$$render;
            return pipe.def.run(this.assets, pipe.state, pipe.output, ctx, region, this.tree);
        }

        preRender () {

        }

        hitTest (pos: Point, list: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean {
            var pipe = this.$$hittest;
            return pipe.def.run(pipe.data, pos, list, ctx, includeAll === true);
        }

        /////// SIZE UPDATES

        onSizeChanged (oldSize: Size, newSize: Size) {
            this.$$sizeupdater.onSizeChanged(oldSize, newSize);
        }

        setSizeUpdater (updater: ISizeUpdater) {
            this.$$sizeupdater = updater || NO_SIZE_UPDATER;
        }

        /////// INVALIDATES

        invalidateMeasure (): Updater {
            this.assets.dirtyFlags |= DirtyFlags.Measure;
            Updater.$$propagateUiFlagsUp(this, UIFlags.MeasureHint);
            return this;
        }

        invalidateArrange (): Updater {
            this.assets.dirtyFlags |= DirtyFlags.Arrange;
            Updater.$$propagateUiFlagsUp(this, UIFlags.ArrangeHint);
            return this;
        }

        updateBounds (forceRedraw?: boolean): Updater {
            var assets = this.assets;
            assets.dirtyFlags |= DirtyFlags.Bounds;
            Updater.$$addUpDirty(this);
            if (forceRedraw === true)
                assets.forceInvalidate = true;
            return this;
        }

        fullInvalidate (invTransforms?: boolean): Updater {
            var assets = this.assets;
            this.invalidate(assets.surfaceBoundsWithChildren);
            if (invTransforms) {
                assets.dirtyFlags |= DirtyFlags.LocalTransform;
                Updater.$$addDownDirty(this);
            }
            this.updateBounds(true);
            return this;
        }

        invalidate (region?: Rect): Updater {
            var assets = this.assets;
            if (!assets.totalIsRenderVisible || (assets.totalOpacity * 255) < 0.5)
                return this;
            assets.dirtyFlags |= DirtyFlags.Invalidate;
            Updater.$$addUpDirty(this);
            if (!region)
                region = assets.surfaceBoundsWithChildren;
            Rect.union(assets.dirtyRegion, region);
            return this;
        }

        findChildInList (list: Updater[]) {
            for (var i = 0, len = list.length; i < len; i++) {
                if (list[i].tree.visualParent === this)
                    return i;
            }
            return -1;
        }

        /////// STATIC HELPERS

        static $$addUpDirty (updater: Updater) {
            var surface = updater.tree.surface;
            if (surface && !updater.$$inUpDirty) {
                surface.addUpDirty(updater);
                updater.$$inUpDirty = true;
            }
        }

        static $$addDownDirty (updater: Updater) {
            var surface = updater.tree.surface;
            if (surface && !updater.$$inDownDirty) {
                surface.addDownDirty(updater);
                updater.$$inDownDirty = true;
            }
        }

        static $$propagateUiFlagsUp (updater: Updater, flags: UIFlags) {
            updater.assets.uiFlags |= flags;
            var vpu = updater;
            while ((vpu = vpu.tree.visualParent) != null && (vpu.assets.uiFlags & flags) === 0) {
                vpu.assets.uiFlags |= flags;
            }
        }

        static transformToVisual (fromUpdater: Updater, toUpdater?: Updater): number[] {
            if (!fromUpdater.tree.surface || (toUpdater && !toUpdater.tree.surface))
                return null;

            //1. invert transform from input element to top level
            //2. transform back down to this element
            var m = mat3.create();
            var a = fromUpdater.assets.absoluteXform;
            // A = From, B = To, M = what we want
            // A = M * B
            // => M = A * inv(B)
            if (toUpdater) {
                var invB = mat3.inverse(toUpdater.assets.absoluteXform, mat3.create());
                mat3.multiply(a, invB, m); //M = A * inv(B)
            } else {
                mat3.copyTo(a, m); //M = A
            }

            return m;
        }

        static transformPoint (updater: Updater, p: Point) {
            var inverse: number[] = mat3.inverse(updater.assets.absoluteXform, mat3.create());
            if (!inverse) {
                console.warn("Could not get inverse of Absolute Transform for UIElement.");
                return;
            }

            var p2: number[] = vec2.create(p.x, p.y);
            mat3.transformVec2(inverse, p2);
            p.x = p2[0];
            p.y = p2[1];
        }
    }
}