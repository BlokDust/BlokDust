declare module minerva {
    var version: string;
}
declare module minerva {
    enum HorizontalAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Stretch = 3,
    }
    enum VerticalAlignment {
        Top = 0,
        Center = 1,
        Bottom = 2,
        Stretch = 3,
    }
}
declare module minerva {
    interface ICornerRadius {
        topLeft: number;
        topRight: number;
        bottomRight: number;
        bottomLeft: number;
    }
    class CornerRadius implements ICornerRadius {
        topLeft: number;
        topRight: number;
        bottomRight: number;
        bottomLeft: number;
        constructor(topLeft?: number, topRight?: number, bottomRight?: number, bottomLeft?: number);
        static isEmpty(cr: ICornerRadius): boolean;
        static isEqual(cr1: ICornerRadius, cr2: ICornerRadius): boolean;
        static clear(dest: ICornerRadius): void;
        static copyTo(cr2: ICornerRadius, dest: ICornerRadius): void;
    }
}
declare module minerva {
    enum Orientation {
        Horizontal = 0,
        Vertical = 1,
    }
    enum PenLineJoin {
        Miter = 0,
        Bevel = 1,
        Round = 2,
    }
    enum PenLineCap {
        Flat = 0,
        Square = 1,
        Round = 2,
        Triangle = 3,
    }
    enum FillRule {
        EvenOdd = 0,
        NonZero = 1,
    }
    enum Stretch {
        None = 0,
        Fill = 1,
        Uniform = 2,
        UniformToFill = 3,
    }
    enum FlowDirection {
        LeftToRight = 0,
        RightToLeft = 1,
    }
    enum LineStackingStrategy {
        MaxHeight = 0,
        BlockLineHeight = 1,
    }
    enum TextAlignment {
        Left = 0,
        Center = 1,
        Right = 2,
        Justify = 3,
    }
    enum TextTrimming {
        None = 0,
        WordEllipsis = 1,
        CharacterEllipsis = 2,
    }
    enum TextWrapping {
        NoWrap = 0,
        Wrap = 1,
        WrapWithOverflow = 2,
    }
    enum TextDecorations {
        None = 0,
        Underline = 1,
    }
    enum FontWeight {
        Thin = 100,
        ExtraLight = 200,
        Light = 300,
        Normal = 400,
        Medium = 500,
        SemiBold = 600,
        Bold = 700,
        ExtraBold = 800,
        Black = 900,
        ExtraBlack = 950,
    }
    enum SweepDirection {
        Counterclockwise = 0,
        Clockwise = 1,
    }
}
declare module minerva {
    enum DirtyFlags {
        Transform = 1,
        LocalTransform = 2,
        Clip = 8,
        LocalClip = 16,
        LayoutClip = 32,
        RenderVisibility = 64,
        HitTestVisibility = 128,
        ImageMetrics = 256,
        Measure = 512,
        Arrange = 1024,
        Bounds = 1048576,
        NewBounds = 2097152,
        Invalidate = 4194304,
        InUpDirtyList = 1073741824,
        InDownDirtyList = -2147483648,
        DownDirtyState = 507,
        UpDirtyState = 7340032,
        PropagateDown = 225,
    }
    enum UIFlags {
        None = 0,
        RenderVisible = 2,
        HitTestVisible = 4,
        TotalRenderVisible = 8,
        TotalHitTestVisible = 16,
        MeasureHint = 2048,
        ArrangeHint = 4096,
        SizeHint = 8192,
        Hints = 14336,
    }
    enum ShapeFlags {
        None = 0,
        Empty = 1,
        Normal = 2,
        Degenerate = 4,
        Radii = 8,
    }
}
declare module minerva {
    var FontStyle: {
        Normal: string;
        Italic: string;
        Oblique: string;
    };
    var FontStretch: {
        UltraCondensed: string;
        ExtraCondensed: string;
        Condensed: string;
        SemiCondensed: string;
        Normal: string;
        SemiExpanded: string;
        Expanded: string;
        ExtraExpanded: string;
        UltraExpanded: string;
    };
    class Font {
        static DEFAULT_FAMILY: string;
        static DEFAULT_STRETCH: string;
        static DEFAULT_STYLE: string;
        static DEFAULT_WEIGHT: FontWeight;
        static DEFAULT_SIZE: number;
        family: string;
        size: number;
        stretch: string;
        style: string;
        weight: FontWeight;
        private $$cachedObj;
        private $$cachedHeight;
        static mergeInto(font: Font, family: string, size: number, stretch: string, style: string, weight: FontWeight): boolean;
        toHtml5Object(): any;
        getHeight(): number;
        getAscender(): number;
        getDescender(): number;
    }
}
declare module minerva.fontHeight {
    var cache: {
        hits: number;
        misses: number;
    };
    function get(font: Font): number;
}
declare module minerva {
    interface IBrush {
        isTransparent(): boolean;
        setupBrush(ctx: CanvasRenderingContext2D, region: Rect): any;
        toHtml5Object(): any;
    }
    class FakeBrush implements IBrush {
        raw: any;
        constructor(raw: any);
        isTransparent(): boolean;
        setupBrush(ctx: CanvasRenderingContext2D, region: Rect): any;
        toHtml5Object(): any;
    }
}
declare module minerva {
    interface IEffect {
        PreRender(ctx: core.render.RenderContext): any;
        PostRender(ctx: core.render.RenderContext): any;
        GetPadding(thickness: Thickness): boolean;
    }
}
declare module minerva {
    interface IGeometry {
        Draw(ctx: core.render.RenderContext): any;
        GetBounds(): Rect;
    }
}
declare module minerva {
    interface IProjection {
        setObjectSize(objectWidth: number, objectHeight: number): any;
        getDistanceFromXYPlane(): number;
        getTransform(): number[];
    }
}
declare module minerva {
    interface IScrollData {
        canHorizontallyScroll: boolean;
        canVerticallyScroll: boolean;
        offsetX: number;
        offsetY: number;
        cachedOffsetX: number;
        cachedOffsetY: number;
        viewportWidth: number;
        viewportHeight: number;
        extentWidth: number;
        extentHeight: number;
        maxDesiredWidth: number;
        maxDesiredHeight: number;
        invalidate(): any;
    }
}
declare module minerva {
    var NO_SIZE_UPDATER: ISizeUpdater;
    interface ISizeUpdater {
        setActualWidth(value: number): any;
        setActualHeight(value: number): any;
        onSizeChanged(oldSize: Size, newSize: Size): any;
    }
}
declare module minerva {
    interface ITransform {
        getRaw(): number[];
    }
}
declare module minerva {
    interface IVirtualizingContainerOwner {
        itemCount: number;
        createGenerator(index: number, count: number): IVirtualizingGenerator;
        remove(index: number, count: number): any;
    }
}
declare module minerva {
    interface IVirtualizingGenerator {
        current: core.Updater;
        generate(): boolean;
    }
}
declare module minerva {
    interface IWalker<T> {
        current: T;
        step(): boolean;
    }
    interface IDeepWalker<T> {
        current: T;
        step(): boolean;
        skipBranch(): any;
    }
    enum WalkDirection {
        Forward = 0,
        Reverse = 1,
        ZForward = 2,
        ZReverse = 3,
    }
}
declare module minerva {
    interface IPoint {
        x: number;
        y: number;
    }
    class Point implements IPoint {
        x: number;
        y: number;
        constructor(x?: number, y?: number);
        static isEqual(p1: IPoint, p2: IPoint): boolean;
        static copyTo(src: IPoint, dest: IPoint): void;
    }
}
interface IVector2Static {
    create(x: number, y: number): number[];
    init(x: number, y: number, dest?: number[]): number[];
}
declare module minerva {
    var vec2: IVector2Static;
}
declare var vec2: IVector2Static;
declare module minerva {
    enum RectOverlap {
        Out = 0,
        In = 1,
        Part = 2,
    }
    class Rect implements IPoint, ISize {
        x: number;
        y: number;
        width: number;
        height: number;
        constructor(x?: number, y?: number, width?: number, height?: number);
        static clear(rect: Rect): void;
        static getBottom(rect: Rect): number;
        static getRight(rect: Rect): number;
        static isEqual(rect1: Rect, rect2: Rect): boolean;
        static isEmpty(src: Rect): boolean;
        static copyTo(src: Rect, dest: Rect): void;
        static roundOut(dest: Rect): void;
        static roundIn(dest: Rect): Rect;
        static intersection(dest: Rect, rect2: Rect): void;
        static union(dest: Rect, rect2: Rect): void;
        static isContainedIn(src: Rect, test: Rect): boolean;
        static containsPoint(rect1: Rect, p: Point): boolean;
        static extendTo(dest: Rect, x: number, y: number): void;
        static grow(dest: Rect, left: number, top: number, right: number, bottom: number): Rect;
        static shrink(dest: Rect, left: number, top: number, right: number, bottom: number): void;
        static rectIn(rect1: Rect, rect2: Rect): RectOverlap;
        static transform(dest: Rect, mat: number[]): Rect;
        static transform4(dest: Rect, projection: number[]): void;
    }
}
declare module minerva {
    interface ISize {
        width: number;
        height: number;
    }
    class Size implements ISize {
        width: number;
        height: number;
        constructor(width?: number, height?: number);
        static copyTo(src: ISize, dest: ISize): void;
        static isEqual(size1: ISize, size2: ISize): boolean;
        static isEmpty(size: Size): boolean;
        static min(dest: ISize, size2: ISize): void;
        static isUndef(size: ISize): boolean;
        static undef(size: ISize): void;
    }
}
declare module minerva {
    class Thickness {
        left: number;
        top: number;
        right: number;
        bottom: number;
        constructor(left?: number, top?: number, right?: number, bottom?: number);
        static add(dest: Thickness, t2: Thickness): void;
        static copyTo(thickness: Thickness, dest: Thickness): void;
        static isEmpty(thickness: Thickness): boolean;
        static isBalanced(thickness: Thickness): boolean;
        static shrinkSize(thickness: Thickness, dest: Size): Size;
        static shrinkRect(thickness: Thickness, dest: Rect): void;
        static shrinkCornerRadius(thickness: Thickness, dest: ICornerRadius): void;
        static growSize(thickness: Thickness, dest: Size): Size;
        static growRect(thickness: Thickness, dest: Rect): void;
        static growCornerRadius(thickness: Thickness, dest: ICornerRadius): void;
    }
}
declare module minerva.Vector {
    function create(x: number, y: number): number[];
    function reverse(v: number[]): number[];
    function orthogonal(v: number[]): number[];
    function normalize(v: number[]): number[];
    function rotate(v: number[], theta: number): number[];
    function angleBetween(u: number[], v: number[]): number;
    function isClockwiseTo(v1: number[], v2: number[]): boolean;
    function intersection(s1: number[], d1: number[], s2: number[], d2: number[]): number[];
}
declare module minerva {
    enum Visibility {
        Visible = 0,
        Collapsed = 1,
    }
}
declare module minerva {
    function findElementsInHostSpace(pos: Point, host: core.Updater): core.Updater[];
}
declare module minerva {
    var errors: any[];
    function layoutError(tree: core.IUpdaterTree, pipedef: any, message: string): void;
}
declare module minerva {
    function singleton(type: Function): any;
}
declare module minerva.pipe {
    interface IPipeData {
    }
    interface IPipeDef<TData extends IPipeData> {
        run(...contexts: any[]): boolean;
        prepare(data: TData): any;
        flush(data: TData): any;
    }
}
declare module minerva.pipe {
    interface IPipeInput {
    }
    interface IPipeState {
    }
    interface IPipeOutput {
    }
    interface ITriPipeDef<TInput extends IPipeInput, TState extends IPipeState, TOutput extends IPipeOutput> {
        run(input: TInput, state: TState, output: TOutput, ...contexts: any[]): boolean;
        createState(): TState;
        createOutput(): TOutput;
        prepare(input: TInput, state: TState, output: TOutput): any;
        flush(input: TInput, state: TState, output: TOutput): any;
    }
}
declare module minerva.pipe {
    class ITriPipe<TInput extends IPipeInput, TState extends IPipeState, TOutput extends IPipeOutput> {
        def: ITriPipeDef<TInput, TState, TOutput>;
        state: TState;
        output: TOutput;
    }
    function createTriPipe<TInput extends IPipeInput, TState extends IPipeState, TOutput extends IPipeOutput>(pipedef: ITriPipeDef<TInput, TState, TOutput>): ITriPipe<TInput, TState, TOutput>;
}
declare module minerva.pipe {
    interface ITapin {
        (data: IPipeData, ...contexts: any[]): boolean;
    }
    class PipeDef<T extends ITapin, TData extends IPipeData> implements IPipeDef<TData> {
        private $$names;
        private $$tapins;
        addTapin(name: string, tapin: T): PipeDef<T, TData>;
        addTapinBefore(before: string, name: string, tapin: T): PipeDef<T, TData>;
        addTapinAfter(after: string, name: string, tapin: T): PipeDef<T, TData>;
        replaceTapin(name: string, tapin: T): PipeDef<T, TData>;
        removeTapin(name: string): PipeDef<T, TData>;
        run(data: TData, ...contexts: any[]): boolean;
        prepare(data: TData, ...contexts: any[]): void;
        flush(data: TData, ...contexts: any[]): void;
    }
}
declare module minerva.pipe {
    interface ITriTapin {
        (input: IPipeInput, state: IPipeState, output: IPipeOutput, ...contexts: any[]): boolean;
    }
    class TriPipeDef<T extends ITriTapin, TInput extends IPipeInput, TState extends IPipeState, TOutput extends IPipeOutput> implements ITriPipeDef<TInput, TState, TOutput> {
        private $$names;
        private $$tapins;
        addTapin(name: string, tapin: T): TriPipeDef<T, TInput, TState, TOutput>;
        addTapinBefore(before: string, name: string, tapin: T): TriPipeDef<T, TInput, TState, TOutput>;
        addTapinAfter(after: string, name: string, tapin: T): TriPipeDef<T, TInput, TState, TOutput>;
        replaceTapin(name: string, tapin: T): TriPipeDef<T, TInput, TState, TOutput>;
        removeTapin(name: string): TriPipeDef<T, TInput, TState, TOutput>;
        run(input: TInput, state: TState, output: TOutput, ...contexts: any[]): boolean;
        createState(): TState;
        createOutput(): TOutput;
        prepare(input: TInput, state: TState, output: TOutput, ...contexts: any[]): void;
        flush(input: TInput, state: TState, output: TOutput, ...contexts: any[]): void;
    }
}
declare module minerva.core {
    interface IShape {
        stretch: Stretch;
        fill: IBrush;
        fillRule: FillRule;
        stroke: IBrush;
        strokeThickness: number;
        strokeStartLineCap: PenLineCap;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;
        actualWidth: number;
        actualHeight: number;
        draw(ctx: render.RenderContext): IShape;
        doFill(ctx: render.RenderContext, region: Rect): IShape;
        doStroke(ctx: render.RenderContext, region: Rect): IShape;
    }
}
declare module minerva.core {
    interface IMeasurePipe extends pipe.ITriPipe<measure.IInput, measure.IState, measure.IOutput> {
    }
    interface IArrangePipe extends pipe.ITriPipe<arrange.IInput, arrange.IState, arrange.IOutput> {
    }
    interface ISizingPipe extends pipe.ITriPipe<sizing.IInput, sizing.IState, sizing.IOutput> {
    }
    interface IProcessDownPipe extends pipe.ITriPipe<processdown.IInput, processdown.IState, processdown.IOutput> {
    }
    interface IProcessUpPipe extends pipe.ITriPipe<processup.IInput, processup.IState, processup.IOutput> {
    }
    interface IRenderPipe extends pipe.ITriPipe<render.IInput, render.IState, render.IOutput> {
    }
    interface IHitTestPipe {
        def: pipe.IPipeDef<hittest.IHitTestData>;
        data: hittest.IHitTestData;
    }
    interface ISurface extends IVisualOwner {
        width: number;
        height: number;
        addUpDirty(updater: Updater): any;
        addDownDirty(updater: Updater): any;
        attachLayer(layer: core.Updater, root?: boolean): any;
        detachLayer(layer: core.Updater): any;
        hookPrerender(updater: core.Updater): any;
        unhookPrerender(updater: core.Updater): any;
    }
    interface IUpdaterAssets extends measure.IInput, arrange.IInput, sizing.IInput, processdown.IInput, processup.IInput, render.IInput {
    }
}
declare module minerva.core {
    class Updater {
        private $$measure;
        private $$measureBinder;
        private $$arrange;
        private $$arrangeBinder;
        private $$sizing;
        private $$processdown;
        private $$processup;
        private $$render;
        private $$hittest;
        private $$inDownDirty;
        private $$inUpDirty;
        private $$attached;
        private $$sizeupdater;
        assets: IUpdaterAssets;
        tree: IUpdaterTree;
        constructor();
        init(): void;
        setTree(tree?: IUpdaterTree): Updater;
        getAttachedValue(name: string): any;
        setAttachedValue(name: string, value?: any): void;
        onDetached(): void;
        onAttached(): void;
        setVisualParent(visualParent: Updater): Updater;
        setSurface(surface: ISurface): Updater;
        onSurfaceChanged(oldSurface: ISurface, newSurface: ISurface): void;
        walkDeep(dir?: WalkDirection): IDeepWalker<Updater>;
        setMeasurePipe(pipedef?: measure.MeasurePipeDef): Updater;
        setMeasureBinder(mb?: measure.IMeasureBinder): Updater;
        setArrangePipe(pipedef?: arrange.ArrangePipeDef): Updater;
        setArrangeBinder(ab?: arrange.IArrangeBinder): Updater;
        setSizingPipe(pipedef?: sizing.SizingPipeDef): Updater;
        setProcessDownPipe(pipedef?: processdown.ProcessDownPipeDef): Updater;
        setProcessUpPipe(pipedef?: processup.ProcessUpPipeDef): Updater;
        setRenderPipe(pipedef?: render.RenderPipeDef): Updater;
        setHitTestPipe(pipedef?: hittest.HitTestPipeDef): Updater;
        doMeasure(): void;
        measure(availableSize: Size): boolean;
        doArrange(): void;
        arrange(finalRect: Rect): boolean;
        sizing(oldSize: Size, newSize: Size): boolean;
        processDown(): boolean;
        processUp(): boolean;
        render(ctx: render.RenderContext, region: Rect): boolean;
        preRender(): void;
        hitTest(pos: Point, list: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
        onSizeChanged(oldSize: Size, newSize: Size): void;
        setSizeUpdater(updater: ISizeUpdater): void;
        invalidateMeasure(): Updater;
        invalidateArrange(): Updater;
        updateBounds(forceRedraw?: boolean): Updater;
        fullInvalidate(invTransforms?: boolean): Updater;
        invalidate(region?: Rect): Updater;
        findChildInList(list: Updater[]): number;
        static $$addUpDirty(updater: Updater): void;
        static $$addDownDirty(updater: Updater): void;
        static $$propagateUiFlagsUp(updater: Updater, flags: UIFlags): void;
        static transformToVisual(fromUpdater: Updater, toUpdater?: Updater): number[];
        static transformPoint(updater: Updater, p: Point): void;
    }
}
declare module minerva.core {
    interface IVisualOwner {
        updateBounds(): any;
        invalidate(region: Rect): any;
    }
    interface IUpdaterTree {
        isTop: boolean;
        surface: ISurface;
        visualParent: Updater;
        visualOwner: IVisualOwner;
        isContainer: boolean;
        isLayoutContainer: boolean;
        walk(direction?: WalkDirection): IWalker<Updater>;
        onChildAttached(child: Updater): any;
        onChildDetached(child: Updater): any;
        applyTemplate(): boolean;
        setTemplateApplier(applier: () => boolean): any;
    }
    class UpdaterTree implements IUpdaterTree {
        isTop: boolean;
        surface: any;
        visualParent: any;
        isContainer: boolean;
        isLayoutContainer: boolean;
        subtree: any;
        visualOwner: IVisualOwner;
        walk(direction?: WalkDirection): IWalker<Updater>;
        onChildAttached(child: core.Updater): void;
        onChildDetached(child: core.Updater): void;
        setTemplateApplier(applier: () => boolean): void;
        applyTemplate(): boolean;
    }
}
declare module minerva.core.helpers {
    interface ISized {
        width: number;
        height: number;
        minWidth: number;
        minHeight: number;
        maxWidth: number;
        maxHeight: number;
        useLayoutRounding: boolean;
    }
    function coerceSize(size: ISize, assets: ISized): void;
    function intersectBoundsWithClipPath(dest: Rect, src: Rect, thickness: Thickness, xform: number[], clip: IGeometry, layoutClip: Rect): void;
    interface IClipAssets {
        layoutClip: Rect;
        breakLayoutClip: boolean;
        visualOffset: Point;
    }
    function renderLayoutClip(ctx: render.RenderContext, assets: IClipAssets, tree: core.IUpdaterTree): void;
}
declare module minerva.core.reactTo {
    module helpers {
        function invalidateParent(updater: Updater): void;
        function sizeChanged(updater: Updater): void;
        function alignmentChanged(updater: Updater): void;
    }
    function isHitTestVisible(updater: Updater, oldValue: boolean, newValue: boolean): void;
    function useLayoutRounding(updater: Updater, oldValue: boolean, newValue: boolean): void;
    function opacity(updater: Updater, oldValue: number, newValue: number): void;
    function visibility(updater: Updater, oldValue: Visibility, newValue: Visibility): void;
    function effect(updater: Updater, oldValue: IEffect, newValue: IEffect): void;
    function clip(updater: Updater, oldValue: IGeometry, newValue: IGeometry): void;
    function renderTransform(updater: Updater, oldValue: any, newValue: any): void;
    function renderTransformOrigin(updater: Updater, oldValue: Point, newValue: Point): void;
    var width: typeof helpers.sizeChanged;
    var height: typeof helpers.sizeChanged;
    var minWidth: typeof helpers.sizeChanged;
    var minHeight: typeof helpers.sizeChanged;
    var maxWidth: typeof helpers.sizeChanged;
    var maxHeight: typeof helpers.sizeChanged;
    var margin: typeof helpers.sizeChanged;
    var flowDirection: typeof helpers.sizeChanged;
    var horizontalAlignment: typeof helpers.alignmentChanged;
    var verticalAlignment: typeof helpers.alignmentChanged;
}
declare module minerva.core.arrange {
    interface IArrangeBinder {
        bind(updater: Updater): boolean;
    }
    class ArrangeBinder implements IArrangeBinder {
        bind(updater: Updater): boolean;
        expandViewport(viewport: Rect, assets: IUpdaterAssets, tree: IUpdaterTree): void;
        shiftViewport(viewport: Rect, updater: Updater): void;
    }
}
declare module minerva.core.arrange {
    interface IArrangeTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean;
    }
    interface IInput extends pipe.IPipeInput, helpers.ISized {
        margin: Thickness;
        horizontalAlignment: HorizontalAlignment;
        verticalAlignment: VerticalAlignment;
        visibility: Visibility;
        hiddenDesire: Size;
        dirtyFlags: DirtyFlags;
        uiFlags: UIFlags;
        layoutSlot: Rect;
        renderSize: Size;
        lastRenderSize: Size;
        layoutXform: number[];
        layoutClip: Rect;
        visualOffset: Point;
    }
    interface IState extends pipe.IPipeState {
        arrangedSize: Size;
        finalRect: Rect;
        finalSize: Size;
        childRect: Rect;
        framework: Size;
        stretched: Size;
        constrained: Size;
        flipHorizontal: boolean;
    }
    interface IOutput extends pipe.IPipeOutput {
        dirtyFlags: DirtyFlags;
        layoutSlot: Rect;
        layoutXform: number[];
        layoutClip: Rect;
        renderSize: Size;
        lastRenderSize: Size;
        visualOffset: Point;
        uiFlags: UIFlags;
        origDirtyFlags: DirtyFlags;
        origUiFlags: UIFlags;
        newUpDirty: DirtyFlags;
        newDownDirty: DirtyFlags;
        newUiFlags: UIFlags;
    }
    class ArrangePipeDef extends pipe.TriPipeDef<IArrangeTapin, IInput, IState, IOutput> {
        constructor();
        createState(): IState;
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module minerva.core.draft {
    interface IDraftTapin extends pipe.ITapin {
        (data: IDraftPipeData): boolean;
    }
    interface IDraftPipeData extends pipe.IPipeData {
        updater: Updater;
        tree: IUpdaterTree;
        assets: IUpdaterAssets;
        flag: UIFlags;
        measureList: Updater[];
        arrangeList: Updater[];
        sizingList: Updater[];
        surfaceSize: Size;
        sizingUpdates: ISizingUpdate[];
    }
    interface ISizingUpdate {
        updater: Updater;
        oldSize: Size;
        newSize: Size;
    }
    class DraftPipeDef extends pipe.PipeDef<IDraftTapin, IDraftPipeData> {
        constructor();
        prepare(data: IDraftPipeData): void;
        flush(data: IDraftPipeData): void;
    }
}
declare module minerva.core.hittest {
    interface IHitTestTapin {
        (data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
    }
    interface IHitTestData {
        assets: IUpdaterAssets;
        tree: IUpdaterTree;
        updater: Updater;
        hitChildren: boolean;
        bounds: Rect;
        layoutClipBounds: Rect;
    }
    class HitTestPipeDef extends pipe.PipeDef<IHitTestTapin, IHitTestData> {
        constructor();
    }
}
declare module minerva.core.measure {
    interface IMeasureBinder {
        bind(updater: Updater): boolean;
    }
    class MeasureBinder implements IMeasureBinder {
        bind(updater: Updater): boolean;
    }
}
declare module minerva.core.measure {
    interface IMeasureTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, availableSize: Size): boolean;
    }
    interface IInput extends pipe.IPipeInput, helpers.ISized {
        margin: Thickness;
        previousConstraint: Size;
        visibility: Visibility;
        desiredSize: Size;
        hiddenDesire: Size;
        dirtyFlags: DirtyFlags;
        uiFlags: UIFlags;
    }
    interface IState extends pipe.IPipeState {
        availableSize: Size;
    }
    interface IOutput extends pipe.IPipeOutput {
        previousConstraint: Size;
        desiredSize: Size;
        hiddenDesire: Size;
        dirtyFlags: DirtyFlags;
        uiFlags: UIFlags;
        origDirtyFlags: DirtyFlags;
        origUiFlags: UIFlags;
        newUpDirty: DirtyFlags;
        newDownDirty: DirtyFlags;
        newUiFlags: UIFlags;
    }
    class MeasurePipeDef extends pipe.TriPipeDef<IMeasureTapin, IInput, IState, IOutput> {
        constructor();
        createState(): IState;
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module minerva.core.processdown {
    interface IProcessDownTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean;
    }
    interface IInput extends pipe.IPipeInput {
        visibility: Visibility;
        opacity: number;
        isHitTestVisible: boolean;
        renderTransform: ITransform;
        renderTransformOrigin: Point;
        actualWidth: number;
        actualHeight: number;
        surfaceBoundsWithChildren: Rect;
        totalIsRenderVisible: boolean;
        totalOpacity: number;
        totalIsHitTestVisible: boolean;
        z: number;
        layoutClip: Rect;
        compositeLayoutClip: Rect;
        layoutXform: number[];
        carrierXform: number[];
        renderXform: number[];
        absoluteXform: number[];
        dirtyFlags: DirtyFlags;
    }
    interface IState extends pipe.IPipeState {
        xformOrigin: Point;
        localXform: number[];
        subtreeDownDirty: DirtyFlags;
    }
    interface IOutput extends pipe.IPipeOutput {
        totalIsRenderVisible: boolean;
        totalOpacity: number;
        totalIsHitTestVisible: boolean;
        z: number;
        compositeLayoutClip: Rect;
        renderXform: number[];
        absoluteXform: number[];
        dirtyFlags: DirtyFlags;
        newUpDirty: DirtyFlags;
    }
    class ProcessDownPipeDef extends pipe.TriPipeDef<IProcessDownTapin, IInput, IState, IOutput> {
        constructor();
        createState(): IState;
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): void;
        flush(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): void;
    }
}
declare module minerva.core.processup {
    interface IProcessUpTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
    }
    interface IInput extends pipe.IPipeInput {
        width: number;
        height: number;
        minWidth: number;
        minHeight: number;
        maxWidth: number;
        maxHeight: number;
        useLayoutRounding: boolean;
        clip: IGeometry;
        actualWidth: number;
        actualHeight: number;
        effectPadding: Thickness;
        renderXform: number[];
        absoluteXform: number[];
        layoutClip: Rect;
        extents: Rect;
        extentsWithChildren: Rect;
        globalBoundsWithChildren: Rect;
        surfaceBoundsWithChildren: Rect;
        totalIsRenderVisible: boolean;
        totalOpacity: number;
        dirtyFlags: DirtyFlags;
        dirtyRegion: Rect;
        forceInvalidate: boolean;
    }
    interface IState extends pipe.IPipeState {
        actualSize: Size;
        invalidateSubtreePaint: boolean;
        hasNewBounds: boolean;
        hasInvalidate: boolean;
    }
    interface IOutput extends pipe.IPipeOutput {
        extents: Rect;
        extentsWithChildren: Rect;
        globalBoundsWithChildren: Rect;
        surfaceBoundsWithChildren: Rect;
        dirtyFlags: DirtyFlags;
        dirtyRegion: Rect;
        forceInvalidate: boolean;
    }
    class ProcessUpPipeDef extends pipe.TriPipeDef<IProcessUpTapin, IInput, IState, IOutput> {
        constructor();
        createState(): IState;
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module minerva.core.render {
    interface IStrokeParameters {
        stroke: IBrush;
        strokeThickness: number;
        strokeLineJoin: PenLineJoin;
        strokeStartLineCap: PenLineCap;
        strokeEndLineCap: PenLineCap;
        strokeMiterLimit: number;
    }
    class RenderContext {
        private $$transforms;
        currentTransform: number[];
        hasFillRule: boolean;
        raw: CanvasRenderingContext2D;
        size: RenderContextSize;
        constructor(ctx: CanvasRenderingContext2D);
        static hasFillRule: boolean;
        applyDpiRatio(): void;
        save(): void;
        restore(): void;
        setTransform(m11: number, m12: number, m21: number, m22: number, dx: number, dy: number): void;
        resetTransform(): void;
        transform(m11: number, m12: number, m21: number, m22: number, dx: number, dy: number): void;
        scale(x: number, y: number): void;
        rotate(angle: number): void;
        translate(x: number, y: number): void;
        apply(mat: number[]): void;
        preapply(mat: number[]): void;
        clipGeometry(geom: IGeometry): void;
        clipRect(rect: Rect): void;
        fillEx(brush: IBrush, region: Rect, fillRule?: FillRule): void;
        isPointInStrokeEx(strokePars: IStrokeParameters, x: number, y: number): boolean;
    }
}
declare module minerva.core.render {
    class RenderContextSize {
        private $$ctx;
        private $$desiredWidth;
        private $$desiredHeight;
        private $$changed;
        desiredWidth: number;
        desiredHeight: number;
        paintWidth: number;
        paintHeight: number;
        dpiRatio: number;
        init(ctx: CanvasRenderingContext2D): void;
        queueResize(width: number, height: number): RenderContextSize;
        commitResize(): RenderContextSize;
        private $adjustCanvas();
    }
}
declare module minerva.core.render {
    interface IRenderTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree): boolean;
    }
    interface IInput extends pipe.IPipeInput {
        totalIsRenderVisible: boolean;
        totalOpacity: number;
        surfaceBoundsWithChildren: Rect;
        layoutClip: Rect;
        breakLayoutClip: boolean;
        visualOffset: Point;
        renderXform: number[];
        clip: IGeometry;
        effect: IEffect;
    }
    interface IState extends pipe.IPipeState {
        renderRegion: Rect;
    }
    interface IOutput extends pipe.IPipeOutput {
    }
    class RenderPipeDef extends pipe.TriPipeDef<IRenderTapin, IInput, IState, IOutput> {
        constructor();
        createState(): IState;
        createOutput(): IOutput;
    }
}
declare module minerva.core.sizing {
    interface ISizingTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree): boolean;
    }
    interface IInput extends pipe.IPipeInput, helpers.ISized {
        visibility: Visibility;
        renderSize: Size;
        actualWidth: number;
        actualHeight: number;
    }
    interface IState extends pipe.IPipeState {
        useRender: boolean;
    }
    interface IOutput extends pipe.IPipeOutput {
        actualSize: Size;
    }
    class SizingPipeDef extends pipe.TriPipeDef<ISizingTapin, IInput, IState, IOutput> {
        constructor();
        createState(): IState;
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput, tree: IUpdaterTree): void;
        flush(input: IInput, state: IState, output: IOutput, tree: IUpdaterTree): void;
    }
}
declare module minerva.core.arrange.tapins {
    var applyRounding: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var buildLayoutClip: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var buildLayoutXform: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var buildRenderSize: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var calcFlip: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var calcStretched: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var calcVisualOffset: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var checkNeedArrange: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var completeOverride: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var doOverride: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var invalidateFuture: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var prepareOverride: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var validateFinalRect: IArrangeTapin;
}
declare module minerva.core.arrange.tapins {
    var validateVisibility: IArrangeTapin;
}
declare module minerva.core.draft.tapins {
    var arrange: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var determinePhase: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var flushPrevious: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var measure: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var notifyResize: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var prepareArrange: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var prepareMeasure: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var prepareSizing: IDraftTapin;
}
declare module minerva.core.draft.tapins {
    var sizing: IDraftTapin;
}
declare module minerva.core.hittest.tapins {
    function canHit(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.hittest.tapins {
    function canHitInside(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.hittest.tapins {
    function completeCtx(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.hittest.tapins {
    function insideChildren(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.hittest.tapins {
    function insideClip(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.hittest.tapins {
    function insideLayoutClip(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.hittest.tapins {
    function insideObject(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.hittest.tapins {
    function prepareCtx(data: IHitTestData, pos: Point, hitList: Updater[], ctx: render.RenderContext, includeAll: boolean): boolean;
}
declare module minerva.core.measure.tapins {
    var applyTemplate: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var checkNeedMeasure: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var completeOverride: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var doOverride: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var finishDesired: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var invalidateFuture: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var prepareOverride: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var validate: IMeasureTapin;
}
declare module minerva.core.measure.tapins {
    var validateVisibility: IMeasureTapin;
}
declare module minerva.core.processdown.tapins {
    var calcAbsoluteXform: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var calcRenderXform: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var calcXformOrigin: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var processHitTestVisibility: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var processLayoutClip: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var processLocalXform: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var processRenderVisibility: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var processXform: IProcessDownTapin;
}
declare module minerva.core.processdown.tapins {
    var propagateDirtyToChildren: IProcessDownTapin;
}
declare module minerva.core.processup.tapins {
    var calcActualSize: IProcessUpTapin;
}
declare module minerva.core.processup.tapins {
    var calcExtents: IProcessUpTapin;
}
declare module minerva.core.processup.tapins {
    var calcPaintBounds: IProcessUpTapin;
}
declare module minerva.core.processup.tapins {
    var processBounds: IProcessUpTapin;
}
declare module minerva.core.processup.tapins {
    var processInvalidate: IProcessUpTapin;
}
declare module minerva.core.processup.tapins {
    var processNewBounds: IProcessUpTapin;
}
declare module minerva.core.render.tapins {
    var applyClip: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var doRender: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var postRender: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var preRender: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var prepareContext: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var renderChildren: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var restoreContext: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var validate: IRenderTapin;
}
declare module minerva.core.render.tapins {
    var validateRegion: IRenderTapin;
}
declare module minerva.core.sizing.tapins {
    var calcUseRender: ISizingTapin;
}
declare module minerva.core.sizing.tapins {
    var computeActual: ISizingTapin;
}
declare module minerva.controls.border.arrange {
    interface IInput extends core.arrange.IInput {
        padding: Thickness;
        borderThickness: Thickness;
    }
    interface IState extends core.arrange.IState {
        totalBorder: Thickness;
    }
    interface IOutput extends core.arrange.IOutput {
    }
    class BorderArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
        createState(): IState;
    }
    function preOverride(input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, finalRect: Rect): boolean;
    function doOverride(input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.border.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: IBorderUpdaterAssets;
    }
    class BorderHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
    module tapins {
        function canHitInside(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.controls.border.measure {
    interface IInput extends core.measure.IInput {
        padding: Thickness;
        borderThickness: Thickness;
    }
    interface IState extends core.measure.IState {
        totalBorder: Thickness;
    }
    interface IOutput extends core.measure.IOutput {
    }
    class BorderMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
        createState(): IState;
    }
    function preOverride(input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, availableSize: Size): boolean;
    function doOverride(input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, availableSize: Size): boolean;
    function postOverride(input: IInput, state: IState, output: IOutput, tree: BorderUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.border.render {
    interface IInput extends core.render.IInput {
        extents: Rect;
        background: IBrush;
        borderBrush: IBrush;
        borderThickness: Thickness;
        cornerRadius: CornerRadius;
    }
    interface IState extends core.render.IState {
        shouldRender: boolean;
        fillExtents: Rect;
        innerCornerRadius: CornerRadius;
        outerCornerRadius: CornerRadius;
    }
    interface IOutput extends core.render.IOutput {
    }
    class BorderRenderPipeDef extends core.render.RenderPipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.border.render {
    interface IShimState extends IState {
        middleCornerRadius: CornerRadius;
        strokeExtents: Rect;
        pattern: CanvasPattern;
        oldMetrics: any;
    }
    class ShimBorderRenderPipeDef extends BorderRenderPipeDef {
        constructor();
        createState(): IShimState;
    }
}
declare module minerva.controls.panel.arrange {
    interface IInput extends core.arrange.IInput {
    }
    interface IState extends core.arrange.IState {
    }
    interface IOutput extends core.arrange.IOutput {
    }
    class PanelArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
    }
}
declare module minerva.controls.canvas.arrange {
    interface IInput extends panel.arrange.IInput {
    }
    interface IState extends panel.arrange.IState {
    }
    interface IOutput extends panel.arrange.IOutput {
    }
    class CanvasArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor();
    }
}
declare module minerva.controls.panel.measure {
    interface IInput extends core.measure.IInput {
    }
    interface IState extends core.measure.IState {
    }
    interface IOutput extends core.measure.IOutput {
    }
    class PanelMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
    }
}
declare module minerva.controls.canvas.measure {
    interface IInput extends panel.measure.IInput {
    }
    interface IState extends panel.measure.IState {
    }
    interface IOutput extends panel.measure.IOutput {
    }
    class CanvasMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor();
    }
}
declare module minerva.controls.canvas.processdown {
    class CanvasProcessDownPipeDef extends core.processdown.ProcessDownPipeDef {
        constructor();
    }
    module tapins {
        function processLayoutClip(input: core.processdown.IInput, state: core.processdown.IState, output: core.processdown.IOutput, vpinput: core.processdown.IInput, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.controls.canvas.processup {
    interface IInput extends core.processup.IInput {
    }
    interface IState extends core.processup.IState {
    }
    interface IOutput extends core.processup.IOutput {
    }
    class CanvasProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor();
    }
}
declare module minerva.controls.control.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: IControlUpdaterAssets;
    }
    class ControlHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
    module tapins {
        function shouldSkip(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
        function canHitInside(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.controls.grid.arrange {
    interface IInput extends panel.arrange.IInput {
        gridState: IGridState;
        columnDefinitions: IColumnDefinition[];
        rowDefinitions: IRowDefinition[];
    }
    interface IState extends panel.arrange.IState {
        consumed: Size;
    }
    interface IOutput extends panel.arrange.IOutput {
    }
    class GridArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.grid.helpers {
    function allocateDesiredSize(rowMat: Segment[][], colMat: Segment[][]): void;
}
declare module minerva.controls.grid.helpers {
    function assignSize(mat: Segment[][], start: number, end: number, size: number, unitType: GridUnitType, desiredSize: boolean): number;
}
declare module minerva.controls.grid.helpers {
    function expandStarCols(mat: Segment[][], coldefs: IColumnDefinition[], availableSize: Size): void;
}
declare module minerva.controls.grid.helpers {
    function expandStarRows(mat: Segment[][], rowdefs: IRowDefinition[], availableSize: Size): void;
}
declare module minerva.controls.grid.measure {
    class GridChildPlacement {
        matrix: Segment[][];
        row: number;
        col: number;
        size: number;
        constructor(matrix: Segment[][], row: number, col: number, size: number);
        static row(matrix: Segment[][], childShape: GridChildShape, child: core.Updater): GridChildPlacement;
        static col(matrix: Segment[][], childShape: GridChildShape, child: core.Updater): GridChildPlacement;
    }
}
declare module minerva.controls.grid.measure {
    enum OverridePass {
        AutoAuto = 0,
        StarAuto = 1,
        AutoStar = 2,
        StarAutoAgain = 3,
        NonStar = 4,
        RemainingStar = 5,
    }
    class GridChildShape {
        starRow: boolean;
        autoRow: boolean;
        starCol: boolean;
        autoCol: boolean;
        col: number;
        row: number;
        colspan: number;
        rowspan: number;
        init(child: core.Updater, rm: Segment[][], cm: Segment[][]): GridChildShape;
        shouldMeasurePass(gridShape: GridShape, childSize: Size, pass: OverridePass): boolean;
        size(childSize: Size, rm: Segment[][], cm: Segment[][]): void;
    }
}
declare module minerva.controls.grid.measure {
    interface IInput extends panel.measure.IInput {
        gridState: IGridState;
        columnDefinitions: IColumnDefinition[];
        rowDefinitions: IRowDefinition[];
    }
    interface IState extends panel.measure.IState {
        totalStars: Size;
        gridShape: GridShape;
        childShapes: GridChildShape[];
        childSize: Size;
        placements: GridChildPlacement[];
        placementIndex: number;
    }
    class GridMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.grid.measure {
    class GridShape {
        hasAutoAuto: boolean;
        hasStarAuto: boolean;
        hasAutoStar: boolean;
        init(childShapes: GridChildShape[]): void;
    }
}
declare module minerva.controls.panel.processup {
    interface IInput extends core.processup.IInput {
        background: IBrush;
    }
    interface IState extends core.processup.IState {
    }
    interface IOutput extends core.processup.IOutput {
    }
    class PanelProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor();
    }
}
declare module minerva.controls.grid.processup {
    interface IInput extends panel.processup.IInput {
        showGridLines: boolean;
    }
    interface IState extends panel.processup.IState {
    }
    interface IOutput extends panel.processup.IOutput {
    }
    class GridProcessUpPipeDef extends panel.processup.PanelProcessUpPipeDef {
        constructor();
    }
}
declare module minerva.controls.panel.render {
    interface IInput extends core.render.IInput, core.helpers.ISized {
        background: IBrush;
        extents: Rect;
    }
    class PanelRenderPipeDef extends core.render.RenderPipeDef {
        constructor();
    }
}
declare module minerva.controls.grid.render {
    interface IInput extends panel.render.IInput {
        actualWidth: number;
        actualHeight: number;
        showGridLines: boolean;
        columnDefinitions: IColumnDefinition[];
        rowDefinitions: IRowDefinition[];
    }
    interface IState extends core.render.IState {
        framework: Size;
    }
    class GridRenderPipeDef extends panel.render.PanelRenderPipeDef {
        constructor();
        createState(): IState;
    }
    module tapins {
        function renderGridLines(input: IInput, state: IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.controls.image.arrange {
    interface IInput extends core.arrange.IInput {
        source: IImageSource;
        stretch: Stretch;
    }
    interface IState extends core.arrange.IState {
        imageBounds: Rect;
        stretchX: number;
        stretchY: number;
    }
    class ImageArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.image.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: IImageUpdaterAssets;
        imgRect: Rect;
    }
    class ImageHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
        prepare(data: IHitTestData): void;
    }
}
declare module minerva.controls.image.measure {
    interface IInput extends core.measure.IInput {
        source: IImageSource;
        stretch: Stretch;
    }
    interface IState extends core.measure.IState {
        imageBounds: Rect;
        stretchX: number;
        stretchY: number;
    }
    class ImageMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.image.processdown {
    interface IInput extends core.processdown.IInput, core.helpers.ISized {
        source: IImageSource;
        stretch: Stretch;
        imgXform: number[];
        overlap: RectOverlap;
        renderSize: Size;
    }
    interface IState extends core.processdown.IState {
        imgRect: Rect;
        paintRect: Rect;
        calcImageMetrics: boolean;
        imgAdjust: boolean;
    }
    interface IOutput extends core.processdown.IOutput {
        imgXform: number[];
        overlap: RectOverlap;
    }
    class ImageProcessDownPipeDef extends core.processdown.ProcessDownPipeDef {
        constructor();
        createState(): IState;
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): void;
        flush(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): void;
    }
}
declare module minerva.controls.image.render {
    interface IInput extends core.render.IInput {
        source: IImageSource;
        imgXform: number[];
        overlap: RectOverlap;
    }
    interface IState extends core.render.IState {
    }
    class ImageRenderPipeDef extends core.render.RenderPipeDef {
        constructor();
    }
}
declare module minerva.controls.overlay.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: IOverlayUpdaterAssets;
    }
    class OverlayHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
    module tapins {
        function shouldSkip(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.controls.overlay.processup {
    class OverlayProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor();
    }
}
declare module minerva.controls.panel.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: IPanelUpdaterAssets;
    }
    class PanelHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
    module tapins {
        function canHitInside(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.controls.popup.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: IPopupUpdaterAssets;
    }
    class PopupHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
    module tapins {
        function shouldSkip(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.controls.popup.processdown {
    interface IInput extends core.processdown.IInput {
        horizontalOffset: number;
        verticalOffset: number;
    }
    class PopupProcessDownPipeDef extends core.processdown.ProcessDownPipeDef {
        constructor();
    }
}
declare module minerva.controls.popup.processup {
    class PopupProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor();
    }
}
declare module minerva.controls.scrollcontentpresenter.arrange {
    interface IInput extends core.arrange.IInput {
        scrollData: IScrollData;
        desiredSize: Size;
        internalClip: Rect;
    }
    interface IState extends core.arrange.IState {
    }
    interface IOutput extends core.arrange.IOutput {
        internalClip: Rect;
    }
    class ScrollContentPresenterArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module minerva.controls.scrollcontentpresenter.measure {
    interface IInput extends core.measure.IInput {
        scrollData: IScrollData;
    }
    interface IState extends core.measure.IState {
        idealSize: Size;
    }
    class ScrollContentPresenterMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.scrollcontentpresenter.render {
    interface IInput extends core.render.IInput {
        internalClip: Rect;
    }
    class ScrollContentPresenterRenderPipeDef extends core.render.RenderPipeDef {
        constructor();
    }
    module tapins {
        function applyInternalClip(input: IInput, state: core.render.IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.controls.stackpanel.arrange {
    interface IInput extends panel.arrange.IInput {
        orientation: Orientation;
    }
    interface IState extends panel.arrange.IState {
    }
    interface IOutput extends panel.arrange.IOutput {
    }
    class StackPanelArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor();
    }
}
declare module minerva.controls.stackpanel.measure {
    interface IInput extends panel.measure.IInput {
        orientation: Orientation;
    }
    interface IState extends panel.measure.IState {
        childAvailable: Size;
    }
    interface IOutput extends panel.measure.IOutput {
    }
    class StackPanelMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.textblock.arrange {
    interface IInput extends core.arrange.IInput, text.IDocumentContext {
        padding: Thickness;
    }
    class TextBlockArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
    }
    module tapins {
        function doOverride(input: IInput, state: core.arrange.IState, output: core.arrange.IOutput, tree: TextBlockUpdaterTree, finalRect: Rect): boolean;
    }
}
declare module minerva.controls.textblock.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: ITextBlockUpdaterAssets;
    }
    class TextBlockHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
    module tapins {
        function canHitInside(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.controls.textblock.measure {
    interface IInput extends core.measure.IInput, text.IDocumentContext {
        padding: Thickness;
    }
    class TextBlockMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
    }
    module tapins {
        function doOverride(input: IInput, state: core.measure.IState, output: core.measure.IOutput, tree: TextBlockUpdaterTree, availableSize: Size): boolean;
    }
}
declare module minerva.controls.textblock.processup {
    interface IInput extends core.processup.IInput, text.IDocumentContext {
        padding: Thickness;
    }
    class TextBlockProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor();
    }
    module tapins {
        function calcActualSize(input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBlockUpdaterTree): boolean;
        function calcExtents(input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBlockUpdaterTree): boolean;
    }
}
declare module minerva.controls.textblock.render {
    interface IInput extends core.render.IInput, text.IDocumentContext {
        padding: Thickness;
    }
    class TextBlockRenderPipeDef extends core.render.RenderPipeDef {
        constructor();
    }
    module tapins {
        function doRender(input: IInput, state: core.render.IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBlockUpdaterTree): boolean;
    }
}
declare module minerva.controls.textboxview.arrange {
    interface IInput extends core.arrange.IInput, text.IDocumentContext {
    }
    class TextBoxViewArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
    }
    module tapins {
        function doOverride(input: IInput, state: core.arrange.IState, output: core.arrange.IOutput, tree: TextBoxViewUpdaterTree, finalRect: Rect): boolean;
    }
}
declare module minerva.controls.textboxview.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: ITextBoxViewUpdaterAssets;
    }
    class TextBoxViewHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
    module tapins {
        function canHitInside(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.controls.textboxview.measure {
    interface IInput extends core.measure.IInput, text.IDocumentContext {
    }
    class TextBoxViewMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
    }
    module tapins {
        function doOverride(input: IInput, state: core.measure.IState, output: core.measure.IOutput, tree: TextBoxViewUpdaterTree, availableSize: Size): boolean;
    }
}
declare module minerva.controls.textboxview.processup {
    interface IInput extends core.processup.IInput, text.IDocumentContext {
    }
    class TextBoxViewProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor();
    }
    module tapins {
        function calcActualSize(input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBoxViewUpdaterTree): boolean;
        function calcExtents(input: IInput, state: core.processup.IState, output: core.processup.IOutput, tree: TextBoxViewUpdaterTree): boolean;
    }
}
declare module minerva.controls.textboxview.render {
    interface IInput extends core.render.IInput, text.IDocumentContext {
        isCaretVisible: boolean;
        caretRegion: Rect;
        caretBrush: IBrush;
    }
    interface IOutput extends core.render.IOutput {
        caretRegion: Rect;
    }
    class TextBoxViewRenderPipeDef extends core.render.RenderPipeDef {
        constructor();
        createOutput(): IOutput;
        prepare(input: IInput, state: core.render.IState, output: IOutput): void;
        flush(input: IInput, state: core.render.IState, output: IOutput): void;
    }
    module tapins {
        function doRender(input: IInput, state: core.render.IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBoxViewUpdaterTree): boolean;
        function calcCaretRegion(input: IInput, state: core.render.IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBoxViewUpdaterTree): boolean;
        function renderCaret(input: IInput, state: core.render.IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: TextBoxViewUpdaterTree): boolean;
    }
}
declare module minerva.controls.usercontrol.arrange {
    interface IInput extends core.arrange.IInput {
        padding: Thickness;
        borderThickness: Thickness;
    }
    interface IState extends core.arrange.IState {
        totalBorder: Thickness;
    }
    class UserControlArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.usercontrol.measure {
    interface IInput extends core.measure.IInput {
        padding: Thickness;
        borderThickness: Thickness;
    }
    interface IState extends core.measure.IState {
        totalBorder: Thickness;
    }
    class UserControlMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.controls.usercontrol.processdown {
    class UserControlProcessDownPipeDef extends core.processdown.ProcessDownPipeDef {
        constructor();
    }
    module tapins {
        function processLayoutClip(input: core.processdown.IInput, state: core.processdown.IState, output: core.processdown.IOutput, vpinput: core.processdown.IInput, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.controls.virtualizingstackpanel.arrange {
    interface IInput extends panel.arrange.IInput {
        orientation: Orientation;
        scrollData: IScrollData;
    }
    interface IState extends panel.arrange.IState {
    }
    interface IOutput extends panel.arrange.IOutput {
    }
    class VirtualizingStackPanelArrangePipeDef extends panel.arrange.PanelArrangePipeDef {
        constructor();
    }
}
declare module minerva.controls.virtualizingstackpanel.measure {
    interface IInput extends panel.measure.IInput {
        orientation: Orientation;
        scrollData: IScrollData;
    }
    interface IState extends panel.measure.IState {
        childAvailable: Size;
    }
    interface IOutput extends panel.measure.IOutput {
    }
    class VirtualizingStackPanelMeasurePipeDef extends panel.measure.PanelMeasurePipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.shapes.ellipse.helpers {
    function draw(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void;
}
declare module minerva.shapes.shape.hittest {
    interface IHitTestData extends core.hittest.IHitTestData {
        assets: IShapeUpdaterAssets;
    }
    class ShapeHitTestPipeDef extends core.hittest.HitTestPipeDef {
        constructor();
    }
}
declare module minerva.shapes.ellipse.hittest {
    interface IHitTestData extends shape.hittest.IHitTestData {
        assets: IEllipseUpdaterAssets;
    }
    class EllipseHitTestPipeDef extends shape.hittest.ShapeHitTestPipeDef {
        constructor();
    }
    module tapins {
        function drawShape(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.shapes.shape.measure {
    interface IInput extends core.measure.IInput, IShapeProperties {
        naturalBounds: Rect;
    }
    interface IState extends core.measure.IState {
    }
    interface IOutput extends core.measure.IOutput {
        naturalBounds: Rect;
    }
    class ShapeMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor();
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module minerva.shapes.ellipse.measure {
    class EllipseMeasurePipeDef extends shape.measure.ShapeMeasurePipeDef {
        constructor();
    }
    module tapins {
        function shrinkAvailable(input: shape.measure.IInput, state: shape.measure.IState, output: shape.measure.IOutput, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.shapes.shape.render {
    interface IInput extends core.render.IInput {
        fill: IBrush;
        fillRule: FillRule;
        stroke: IBrush;
        strokeThickness: number;
        strokeStartLineCap: PenLineCap;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;
        shapeFlags: ShapeFlags;
        shapeRect: Rect;
        naturalBounds: Rect;
    }
    interface IState extends core.render.IState {
        shouldDraw: boolean;
    }
    interface IOutput extends core.render.IOutput {
    }
    class ShapeRenderPipeDef extends core.render.RenderPipeDef {
        constructor();
        createState(): IState;
    }
}
declare module minerva.shapes.ellipse.render {
    interface IInput extends shape.render.IInput {
        shapeRect: Rect;
    }
    interface IState extends shape.render.IState {
    }
    interface IOutput extends shape.render.IOutput {
    }
    class EllipseRenderPipeDef extends shape.render.ShapeRenderPipeDef {
        constructor();
    }
    module tapins {
        function doRender(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
    }
}
declare module minerva.shapes.path.measure {
    interface IInput extends shape.measure.IInput {
        data: AnonPathGeometry;
    }
    interface IState extends shape.measure.IState {
    }
    interface IOutput extends shape.measure.IOutput {
    }
    class PathMeasurePipeDef extends shape.measure.ShapeMeasurePipeDef {
        constructor();
    }
    module tapins {
        function buildPath(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
        function calcNaturalBounds(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.shapes.line.measure {
    interface IInput extends path.measure.IInput {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
    }
    interface IState extends path.measure.IState {
    }
    interface IOutput extends path.measure.IOutput {
    }
    class LineMeasurePipeDef extends path.measure.PathMeasurePipeDef {
        constructor();
    }
    module tapins {
        function buildPath(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.shapes.path.hittest {
    interface IHitTestData extends shape.hittest.IHitTestData {
        assets: IPathUpdaterAssets;
    }
    class PathHitTestPipeDef extends shape.hittest.ShapeHitTestPipeDef {
        constructor();
    }
    module tapins {
        function drawShape(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.shapes.shape.processup {
    interface IInput extends core.processup.IInput {
        stroke: IBrush;
        strokeThickness: number;
        shapeFlags: ShapeFlags;
        shapeRect: Rect;
    }
    interface IState extends core.processup.IState {
    }
    interface IOutput extends core.processup.IOutput {
        shapeFlags: ShapeFlags;
        shapeRect: Rect;
    }
    class ShapeProcessUpPipeDef extends core.processup.ProcessUpPipeDef {
        constructor();
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module minerva.shapes.path.processup {
    interface IInput extends shape.processup.IInput {
        naturalBounds: Rect;
        data: AnonPathGeometry;
        stretch: Stretch;
        stretchXform: number[];
    }
    interface IState extends shape.processup.IState {
    }
    interface IOutput extends shape.processup.IOutput {
        stretchXform: number[];
    }
    class PathProcessUpPipeDef extends shape.processup.ShapeProcessUpPipeDef {
        constructor();
        createOutput(): IOutput;
        prepare(input: IInput, state: IState, output: IOutput): void;
        flush(input: IInput, state: IState, output: IOutput): void;
    }
}
declare module minerva.shapes.path.render {
    interface IInput extends shape.render.IInput {
        data: AnonPathGeometry;
        stretchXform: number[];
    }
    interface IState extends shape.render.IState {
    }
    interface IOutput extends shape.render.IOutput {
    }
    class PathRenderPipeDef extends shape.render.ShapeRenderPipeDef {
        constructor();
    }
}
declare module minerva.shapes.polyline.measure {
    interface IInput extends path.measure.IInput {
        isClosed: boolean;
        points: IPoint[];
    }
    interface IState extends path.measure.IState {
    }
    interface IOutput extends path.measure.IOutput {
    }
    class PolylineMeasurePipeDef extends path.measure.PathMeasurePipeDef {
        constructor();
    }
    module tapins {
        function buildPath(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.shapes.rectangle.helpers {
    function draw(ctx: CanvasRenderingContext2D, left: number, top: number, width: number, height: number, radiusX: number, radiusY: number): void;
}
declare module minerva.shapes.rectangle.hittest {
    interface IHitTestData extends shape.hittest.IHitTestData {
        assets: IRectangleUpdaterAssets;
    }
    class RectangleHitTestPipeDef extends shape.hittest.ShapeHitTestPipeDef {
        constructor();
    }
    module tapins {
        function drawShape(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
    }
}
declare module minerva.shapes.rectangle.measure {
    class RectangleMeasurePipeDef extends shape.measure.ShapeMeasurePipeDef {
        constructor();
    }
    module tapins {
        function shrinkAvailable(input: shape.measure.IInput, state: shape.measure.IState, output: shape.measure.IOutput, tree: core.IUpdaterTree): boolean;
    }
}
declare module minerva.shapes.rectangle.render {
    interface IInput extends shape.render.IInput {
        radiusX: number;
        radiusY: number;
        shapeRect: Rect;
    }
    interface IState extends shape.render.IState {
    }
    interface IOutput extends shape.render.IOutput {
    }
    class RectangleRenderPipeDef extends shape.render.ShapeRenderPipeDef {
        constructor();
    }
    module tapins {
        function doRender(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
    }
}
declare module minerva.shapes.shape.arrange {
    interface IInput extends core.arrange.IInput {
        stretch: Stretch;
        fill: IBrush;
        fillRule: FillRule;
        stroke: IBrush;
        strokeThickness: number;
        strokeStartLineCap: PenLineCap;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;
        naturalBounds: Rect;
    }
    interface IState extends core.arrange.IState {
    }
    interface IOutput extends core.arrange.IOutput {
    }
    class ShapeArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor();
    }
}
declare module minerva.controls.border.render.helpers {
    function drawBorderRect(ctx: CanvasRenderingContext2D, extents: Rect, cr?: ICornerRadius): void;
}
declare module minerva.controls.border.render.tapins {
    function calcInnerOuter(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.border.render.tapins {
    function calcShouldRender(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.border.render.tapins {
    function doRender(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.canvas.arrange.tapins {
    function buildLayoutClip(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.canvas.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.canvas.measure.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.canvas.processup.tapins {
    var calcPaintBounds: (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree) => boolean;
}
declare module minerva.controls.grid.arrange.tapins {
    function calcConsumed(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.arrange.tapins {
    function restoreMeasureResults(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.arrange.tapins {
    function setActuals(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.measure.tapins {
    function buildShape(input: IInput, state: IState, output: panel.measure.IOutput, tree: panel.PanelUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.measure.tapins {
    function createDoOverridePass(pass: OverridePass): (input: IInput, state: IState, output: panel.measure.IOutput, tree: panel.PanelUpdaterTree, finalRect: Rect) => boolean;
}
declare module minerva.controls.grid.measure.tapins {
    function doOverride(input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.measure.tapins {
    function ensureColMatrix(input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.measure.tapins {
    function ensureRowMatrix(input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid {
    enum GridUnitType {
        Auto = 0,
        Pixel = 1,
        Star = 2,
    }
}
declare module minerva.controls.grid.measure.tapins {
    function prepareColMatrix(input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.measure.tapins {
    function prepareRowMatrix(input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.measure.tapins {
    function saveMeasureResults(input: IInput, state: IState, output: panel.measure.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.grid.processup.tapins {
    function calcExtents(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.grid.processup.tapins {
    function preCalcExtents(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.image.arrange.tapins {
    function calcImageBounds(input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.image.arrange.tapins {
    function calcStretch(input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.image.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.image.arrange.tapins {
    function invalidateMetrics(input: IInput, state: IState, output: core.arrange.IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.image.hittest.tapins {
    function canHitInside(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.controls.image.hittest.tapins {
    function insideChildren(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.controls.image.hittest.tapins {
    function insideStretch(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.controls.image.measure.tapins {
    function calcImageBounds(input: IInput, state: IState, output: core.measure.IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.image.measure.tapins {
    function calcStretch(input: IInput, state: IState, output: core.measure.IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.image.measure.tapins {
    function doOverride(input: IInput, state: IState, output: core.measure.IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.image.processdown.tapins {
    function calcImageTransform(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.image.processdown.tapins {
    function calcOverlap(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.image.processdown.tapins {
    function checkNeedImageMetrics(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.image.processdown.tapins {
    function prepareImageMetrics(input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.image.render.tapins {
    function doRender(input: IInput, state: IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.panel.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.panel.processup.tapins {
    function preCalcExtents(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.popup.processdown.tapins {
    var postProcessXform: (input: IInput, state: core.processdown.IState, output: core.processdown.IOutput, vpinput: core.processdown.IInput, tree: PopupUpdaterTree) => boolean;
}
declare module minerva.controls.popup.processdown.tapins {
    var preProcessXform: (input: IInput, state: core.processdown.IState, output: core.processdown.IOutput, vpinput: core.processdown.IInput, tree: PopupUpdaterTree) => boolean;
}
declare module minerva.controls.scrollcontentpresenter.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.UpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.scrollcontentpresenter.arrange.tapins {
    function updateClip(input: IInput, state: IState, output: IOutput, tree: core.UpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.scrollcontentpresenter.arrange.tapins {
    function updateExtents(input: IInput, state: IState, output: IOutput, tree: core.UpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.scrollcontentpresenter.measure.tapins {
    var doOverride: (input: IInput, state: IState, output: core.measure.IOutput, tree: core.UpdaterTree, availableSize: Size) => boolean;
}
declare module minerva.controls.scrollcontentpresenter.measure.tapins {
    function finishDoOverride(input: IInput, state: IState, output: core.measure.IOutput, tree: core.UpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.scrollcontentpresenter.measure.tapins {
    function updateExtents(input: IInput, state: IState, output: core.measure.IOutput, tree: core.UpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.stackpanel.arrange.tapins {
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.stackpanel.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.stackpanel.arrange.tapins {
    function doVertical(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.stackpanel.measure.tapins {
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.stackpanel.measure.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.stackpanel.measure.tapins {
    function doVertical(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.usercontrol.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: core.arrange.IOutput, tree: control.ControlUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.usercontrol.arrange.tapins {
    function preOverride(input: IInput, state: IState, output: core.arrange.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.usercontrol.measure.tapins {
    function doOverride(input: core.measure.IInput, state: core.measure.IState, output: core.measure.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.usercontrol.measure.tapins {
    function postOverride(input: IInput, state: IState, output: core.measure.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.usercontrol.measure.tapins {
    function preOverride(input: IInput, state: IState, output: core.measure.IOutput, tree: control.ControlUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.virtualizingstackpanel.arrange.tapins {
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.virtualizingstackpanel.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.virtualizingstackpanel.arrange.tapins {
    function doVertical(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, finalRect: Rect): boolean;
}
declare module minerva.controls.virtualizingstackpanel.measure.tapins {
    function doHorizontal(input: IInput, state: IState, output: IOutput, tree: virtualizingpanel.VirtualizingPanelUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.virtualizingstackpanel.measure.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.controls.virtualizingstackpanel.measure.tapins {
    function doVertical(input: IInput, state: IState, output: IOutput, tree: virtualizingpanel.VirtualizingPanelUpdaterTree, availableSize: Size): boolean;
}
declare module minerva.shapes.path.processup.tapins {
    function calcActualSize(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.path.processup.tapins {
    function calcExtents(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.path.processup.tapins {
    function calcShapeRect(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.path.processup.tapins {
    function calcStretch(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.path.render.tapins {
    function doRender(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
}
declare module minerva.shapes.path.render.tapins {
    function fill(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
}
declare module minerva.shapes.shape.arrange.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.shape.hittest.tapins {
    function canHitInside(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.shapes.shape.hittest.tapins {
    function canHitShape(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.shapes.shape.hittest.tapins {
    function drawShape(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.shapes.shape.hittest.tapins {
    function finishShape(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.shapes.shape.hittest.tapins {
    function insideChildren(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.shapes.shape.hittest.tapins {
    function prepareShape(data: IHitTestData, pos: Point, hitList: core.Updater[], ctx: core.render.RenderContext): boolean;
}
declare module minerva.shapes.shape.measure.tapins {
    function calcNaturalBounds(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.shape.measure.tapins {
    function doOverride(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.shape.processup.tapins {
    function calcExtents(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.shape.processup.tapins {
    function calcShapeRect(input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.shape.render.tapins {
    function calcShouldDraw(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
}
declare module minerva.shapes.shape.render.tapins {
    function doRender(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
}
declare module minerva.shapes.shape.render.tapins {
    function fill(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
}
declare module minerva.shapes.shape.render.tapins {
    function finishDraw(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
}
declare module minerva.shapes.shape.render.tapins {
    function prepareDraw(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.shapes.shape.render.tapins {
    function stroke(input: IInput, state: IState, output: IOutput, ctx: core.render.RenderContext, region: Rect): boolean;
}
declare module minerva.controls.border.render.tapins.shim {
    function calcBalanced(input: IInput, state: IShimState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.border.render.tapins.shim {
    function createPattern(input: IInput, state: IShimState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.border.render.tapins.shim {
    function doRender(input: IInput, state: IShimState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.controls.border.render.tapins.shim {
    function invalidatePattern(input: IInput, state: IShimState, output: IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean;
}
declare module minerva.anon {
    class AnonymousUpdater extends core.Updater {
        init(): void;
        measureOverride(availableSize: Size): Size;
        arrangeOverride(arrangeSize: Size): Size;
    }
}
declare module minerva.engine {
    interface IPass extends core.draft.IDraftPipeData {
        count: number;
        maxCount: number;
    }
    class Surface implements core.ISurface {
        private $$layout;
        private $$canvas;
        private $$ctx;
        private $$layers;
        private $$prerenderhooks;
        private $$downDirty;
        private $$upDirty;
        private $$dirtyRegion;
        private $$width;
        private $$height;
        width: number;
        height: number;
        init(canvas: HTMLCanvasElement): void;
        attachLayer(layer: core.Updater, root?: boolean): void;
        detachLayer(layer: core.Updater): void;
        walkLayers(reverse?: boolean): IWalker<core.Updater>;
        updateBounds(): void;
        invalidate(region?: Rect): void;
        render(): void;
        hookPrerender(updater: core.Updater): void;
        unhookPrerender(updater: core.Updater): void;
        addUpDirty(updater: core.Updater): void;
        addDownDirty(updater: core.Updater): void;
        updateLayout(): boolean;
        resize(width: number, height: number): void;
        hitTest(pos: Point): core.Updater[];
        static measureWidth(text: string, font: Font): number;
    }
}
declare module minerva.engine {
    function draft(layers: core.Updater[], draftPipe: core.draft.DraftPipeDef, pass: IPass): boolean;
}
declare module minerva.engine {
    function process(down: core.Updater[], up: core.Updater[]): boolean;
}
interface IMatrix3Static {
    create(src?: number[]): number[];
    copyTo(src: number[], dest: number[]): number[];
    init(dest: number[], m11: number, m12: number, m21: number, m22: number, x0: number, y0: number): number[];
    identity(dest?: number[]): number[];
    equal(a: number[], b: number[]): boolean;
    multiply(a: number[], b: number[], dest?: number[]): number[];
    inverse(mat: number[], dest?: number[]): number[];
    transformVec2(mat: number[], vec: number[], dest?: number[]): number[];
    createTranslate(x: number, y: number, dest?: number[]): number[];
    translate(mat: number[], x: number, y: number): number[];
    createScale(sx: number, sy: number, dest?: number[]): number[];
    scale(mat: number[], sx: number, sy: number): number[];
    createRotate(angleRad: number, dest?: number[]): number[];
    createSkew(angleRadX: number, angleRadY: number, dest?: number[]): number[];
    preapply(dest: number[], mat: number[]): number[];
    apply(dest: number[], mat: number[]): number[];
}
declare module minerva {
    var mat3: IMatrix3Static;
}
declare var mat3: IMatrix3Static;
interface IMatrix4Static {
    create(src?: number[]): number[];
    copyTo(src: number[], dest: number[]): number[];
    identity(dest?: number[]): number[];
    equal(a: number[], b: number[]): boolean;
    multiply(a: number[], b: number[], dest?: number[]): number[];
    inverse(mat: number[], dest?: number[]): number[];
    transformVec4(mat: number[], vec: number[], dest?: number[]): number[];
    createTranslate(x: number, y: number, z: number, dest?: number[]): number[];
    createScale(x: number, y: number, z: number, dest?: number[]): number[];
    createRotateX(theta: number, dest?: number[]): number[];
    createRotateY(theta: number, dest?: number[]): number[];
    createRotateZ(theta: number, dest?: number[]): number[];
    createPerspective(fieldOfViewY: number, aspectRatio: number, zNearPlane: number, zFarPlane: number, dest?: number[]): number[];
    createViewport(width: number, height: number, dest?: number[]): number[];
}
declare module minerva {
    var mat4: IMatrix4Static;
}
declare var mat4: IMatrix4Static;
declare module minerva {
}
interface IVector4Static {
    create(x: number, y: number, z: number, w: number): number[];
    init(x: number, y: number, z: number, w: number, dest?: number[]): number[];
}
declare module minerva {
    var vec4: IVector4Static;
}
declare var vec4: IVector4Static;
declare module minerva.path {
    interface IBoundingBox {
        l: number;
        r: number;
        t: number;
        b: number;
    }
    interface IStrokeParameters {
        strokeThickness: number;
        strokeDashArray: number[];
        strokeDashCap: PenLineCap;
        strokeDashOffset: number;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;
        strokeStartLineCap: PenLineCap;
    }
    interface IPathSegment {
        sx: number;
        sy: number;
        ex: number;
        ey: number;
        isSingle: boolean;
        draw: (canvasCtx: CanvasRenderingContext2D) => void;
        extendFillBox: (box: IBoundingBox) => void;
        extendStrokeBox: (box: IBoundingBox, pars: IStrokeParameters) => void;
        getStartVector(): number[];
        getEndVector(): number[];
    }
}
declare module minerva.path {
    class Path {
        private $$entries;
        private $$endX;
        private $$endY;
        endX: number;
        endY: number;
        reset(): void;
        move(x: number, y: number): void;
        line(x: number, y: number): void;
        quadraticBezier(cpx: number, cpy: number, x: number, y: number): void;
        cubicBezier(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
        ellipse(x: number, y: number, width: number, height: number): void;
        ellipticalArc(rx: number, ry: number, rotationAngle: number, isLargeArcFlag: boolean, sweepDirectionFlag: SweepDirection, ex: number, ey: number): void;
        arc(x: number, y: number, r: number, sAngle: number, eAngle: number, aClockwise: boolean): void;
        arcTo(cpx: number, cpy: number, x: number, y: number, radius: number): void;
        rect(x: number, y: number, width: number, height: number): void;
        roundedRect(x: number, y: number, width: number, height: number, radiusX: number, radiusY: number): void;
        close(): void;
        draw(ctx: CanvasRenderingContext2D): void;
        calcBounds(pars?: IStrokeParameters): Rect;
        private $$calcFillBox();
        private $$calcStrokeBox(pars);
        static Merge(path1: Path, path2: Path): void;
        Serialize(): string;
    }
    function findMiterTips(previous: IPathSegment, entry: IPathSegment, hs: number, miterLimit: number): {
        x: number;
        y: number;
    }[];
    function findBevelTips(previous: IPathSegment, entry: IPathSegment, hs: number): {
        x: number;
        y: number;
    }[];
}
declare module minerva.text {
    interface IDocumentContext {
        selectionStart: number;
        selectionLength: number;
        textWrapping: TextWrapping;
        textAlignment: TextAlignment;
        textTrimming: TextTrimming;
        lineStackingStrategy: LineStackingStrategy;
        lineHeight: number;
    }
    interface IDocumentAssets {
        availableWidth: number;
        actualWidth: number;
        actualHeight: number;
        maxWidth: number;
        maxHeight: number;
        lines: layout.Line[];
        selCached: boolean;
    }
    interface IDocumentLayoutDef {
        createAssets(): IDocumentAssets;
        setMaxWidth(docctx: IDocumentContext, docassets: IDocumentAssets, width: number): boolean;
        layout(docctx: IDocumentContext, docassets: IDocumentAssets, constraint: Size, walker: IWalker<text.TextUpdater>): boolean;
        render(ctx: core.render.RenderContext, docctx: IDocumentContext, docassets: IDocumentAssets): any;
        getCursorFromPoint(point: IPoint, docctx: IDocumentContext, docassets: IDocumentAssets): number;
        getCaretFromCursor(docctx: IDocumentContext, docassets: IDocumentAssets): Rect;
        getHorizontalAlignmentX(docctx: IDocumentContext, assets: IDocumentAssets, lineWidth: number): number;
    }
    class DocumentLayoutDef implements IDocumentLayoutDef {
        createAssets(): IDocumentAssets;
        setMaxWidth(docctx: IDocumentContext, docassets: IDocumentAssets, width: number): boolean;
        layout(docctx: IDocumentContext, docassets: IDocumentAssets, constraint: Size, walker: IWalker<text.TextUpdater>): boolean;
        render(ctx: core.render.RenderContext, docctx: IDocumentContext, docassets: IDocumentAssets): void;
        getCursorFromPoint(point: IPoint, docctx: IDocumentContext, docassets: IDocumentAssets): number;
        getCaretFromCursor(docctx: IDocumentContext, docassets: IDocumentAssets): Rect;
        splitSelection(docctx: IDocumentContext, assets: IDocumentAssets): void;
        getHorizontalAlignmentX(docctx: IDocumentContext, assets: IDocumentAssets, lineWidth: number): number;
        measureTextWidth(text: string, font: Font): number;
    }
}
declare module minerva.text {
    interface IDocumentLayout<T extends IDocumentLayoutDef, TAssets extends IDocumentAssets> {
        def: T;
        assets: TAssets;
    }
    function createDocumentLayout<T extends IDocumentLayoutDef, TAssets extends IDocumentAssets>(def: T): IDocumentLayout<T, TAssets>;
}
declare module minerva.text {
    interface ITextAssets {
        text: string;
        background: IBrush;
        selectionBackground: IBrush;
        foreground: IBrush;
        selectionForeground: IBrush;
        isUnderlined: boolean;
        font: Font;
    }
    interface ITextLayoutDef {
        layout(docctx: IDocumentContext, docassets: IDocumentAssets, assets: ITextAssets): any;
    }
}
declare module minerva.text {
    interface ITextUpdaterAssets extends ITextAssets {
        fontFamily: string;
        fontSize: number;
        fontStretch: string;
        fontStyle: string;
        fontWeight: FontWeight;
        textDecorations: TextDecorations;
        language: string;
    }
    class TextUpdater {
        assets: ITextUpdaterAssets;
        private $$textlayout;
        constructor();
        init(): void;
        setTextLayout(tldef?: ITextLayoutDef): TextUpdater;
        layout(docctx: IDocumentContext, docassets: IDocumentAssets): number;
        invalidateFont(): boolean;
    }
}
declare module minerva.anon.arrange {
    class AnonymousArrangePipeDef extends core.arrange.ArrangePipeDef {
        constructor(upd: AnonymousUpdater);
    }
}
declare module minerva.anon.measure {
    class AnonymousMeasurePipeDef extends core.measure.MeasurePipeDef {
        constructor(upd: AnonymousUpdater);
    }
}
declare module minerva.controls.border {
    interface IBorderUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput {
    }
    class BorderUpdater extends core.Updater {
        tree: BorderUpdaterTree;
        assets: IBorderUpdaterAssets;
        init(): void;
    }
}
declare module minerva.controls.border {
    class BorderUpdaterTree extends core.UpdaterTree {
        isLayoutContainer: boolean;
        isContainer: boolean;
        walk(direction?: WalkDirection): IWalker<core.Updater>;
    }
}
declare module minerva.controls.panel {
    interface IPanelUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, processup.IInput, render.IInput {
    }
    class PanelUpdater extends core.Updater {
        assets: IPanelUpdaterAssets;
        tree: PanelUpdaterTree;
        init(): void;
        setChildren(children: core.Updater[]): PanelUpdater;
    }
    module reactTo {
        function zIndex(updater: core.Updater, oldValue: number, newValue: number): void;
    }
}
declare module minerva.controls.canvas {
    interface ICanvasUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput {
    }
    class CanvasUpdater extends panel.PanelUpdater {
        assets: ICanvasUpdaterAssets;
        init(): void;
    }
    module reactTo {
        function left(updater: core.Updater, oldValue: number, newValue: number): void;
        function top(updater: core.Updater, oldValue: number, newValue: number): void;
    }
}
declare module minerva.controls.control {
    interface IControlUpdaterAssets extends core.IUpdaterAssets {
        isEnabled: boolean;
    }
    class ControlUpdater extends core.Updater {
        assets: IControlUpdaterAssets;
        init(): void;
    }
}
declare module minerva.controls.control {
    class ControlUpdaterTree extends core.UpdaterTree {
        constructor();
    }
}
declare module minerva.controls.grid {
    interface IGridUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput, render.IInput {
        gridState: IGridState;
    }
    class GridUpdater extends panel.PanelUpdater {
        assets: IGridUpdaterAssets;
        init(): void;
    }
    module reactTo {
        function showGridLines(updater: GridUpdater, ov: boolean, nv: boolean): void;
        function column(updater: core.Updater, ov: number, nv: number): void;
        function columnSpan(updater: core.Updater, ov: number, nv: number): void;
        function row(updater: core.Updater, ov: number, nv: number): void;
        function rowSpan(updater: core.Updater, ov: number, nv: number): void;
    }
}
declare module minerva.controls.grid {
    interface IColumnDefinition {
        Width: IGridLength;
        MaxWidth: number;
        MinWidth: number;
        ActualWidth: number;
        setActualWidth(value: number): any;
    }
}
declare module minerva.controls.grid {
    interface IGridLength {
        Value: number;
        Type: GridUnitType;
    }
}
declare module minerva.controls.grid {
    interface IGridState {
        rowMatrix: Segment[][];
        colMatrix: Segment[][];
    }
    function createGridState(): IGridState;
}
declare module minerva.controls.grid {
    interface IRowDefinition {
        Height: IGridLength;
        MaxHeight: number;
        MinHeight: number;
        ActualHeight: number;
        setActualHeight(value: number): any;
    }
}
declare module minerva.controls.grid {
    class Segment {
        desired: number;
        offered: number;
        original: number;
        min: number;
        max: number;
        stars: number;
        type: GridUnitType;
        clamp(value: number): number;
        static init(segment: Segment, offered?: number, min?: number, max?: number, unitType?: GridUnitType): Segment;
    }
}
declare module minerva.controls.image {
    interface IImageSource {
        image: HTMLImageElement;
        pixelWidth: number;
        pixelHeight: number;
        lock(): any;
        unlock(): any;
    }
}
declare module minerva.controls.image {
    interface IImageUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, processdown.IInput, render.IInput {
    }
    class ImageUpdater extends core.Updater {
        assets: IImageUpdaterAssets;
        init(): void;
        invalidateMetrics(): ImageUpdater;
    }
}
declare module minerva.controls.overlay {
    interface IOverlayUpdaterAssets extends core.IUpdaterAssets {
        isVisible: boolean;
        isOpen: boolean;
    }
    class OverlayUpdater extends core.Updater {
        assets: IOverlayUpdaterAssets;
        tree: OverlayUpdaterTree;
        init(): void;
        setInitiator(initiator: core.Updater): void;
        setLayer(layer: core.Updater): void;
        hide(): boolean;
        show(): boolean;
    }
    module reactTo {
        function isOpen(updater: OverlayUpdater, oldValue: boolean, newValue: boolean): void;
    }
}
declare module minerva.controls.overlay {
    class OverlayUpdaterTree extends core.UpdaterTree {
        layer: core.Updater;
        initiatorSurface: core.ISurface;
    }
}
declare module minerva.controls.panel {
    class PanelUpdaterTree extends core.UpdaterTree {
        children: core.Updater[];
        zSorted: core.Updater[];
        constructor();
        walk(direction?: WalkDirection): IWalker<core.Updater>;
        zSort(): void;
        onChildAttached(child: core.Updater): void;
        onChildDetached(child: core.Updater): void;
    }
}
declare module minerva.controls.popup {
    interface IPopupUpdaterAssets extends core.IUpdaterAssets, processdown.IInput {
        isVisible: boolean;
        isOpen: boolean;
    }
    class PopupUpdater extends core.Updater {
        assets: IPopupUpdaterAssets;
        tree: PopupUpdaterTree;
        init(): void;
        setInitiator(initiator: core.Updater): void;
        setChild(child: core.Updater): void;
        setLayer(layer: core.Updater): void;
        hide(): boolean;
        show(): boolean;
    }
    module reactTo {
        function isOpen(updater: PopupUpdater, oldValue: boolean, newValue: boolean): void;
        function horizontalOffset(updater: PopupUpdater, oldValue: number, newValue: number): void;
        function verticalOffset(updater: PopupUpdater, oldValue: number, newValue: number): void;
    }
}
declare module minerva.controls.popup {
    class PopupUpdaterTree extends core.UpdaterTree {
        popupChild: core.Updater;
        layer: core.Updater;
        initiatorSurface: core.ISurface;
    }
}
declare module minerva.controls.scrollcontentpresenter {
    interface IScrollContentPresenterUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput {
    }
    class ScrollContentPresenterUpdater extends core.Updater {
        assets: IScrollContentPresenterUpdaterAssets;
        init(): void;
    }
}
declare module minerva.controls.scrollcontentpresenter {
    module helpers {
        function clampOffsets(sd: IScrollData): boolean;
    }
}
declare module minerva.controls.stackpanel {
    interface IStackPanelUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }
    class StackPanelUpdater extends panel.PanelUpdater {
        assets: IStackPanelUpdaterAssets;
        init(): void;
    }
}
declare module minerva.controls.textblock {
    interface ITextBlockUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput, text.IDocumentContext {
    }
    class TextBlockUpdater extends core.Updater {
        assets: ITextBlockUpdaterAssets;
        tree: TextBlockUpdaterTree;
        init(): void;
        setDocument(docdef?: text.IDocumentLayoutDef): TextBlockUpdater;
        invalidateFont(full?: boolean): void;
        invalidateTextMetrics(): void;
    }
}
declare module minerva.controls.textblock {
    interface ITextBlockUpdaterTree {
        doc: text.IDocumentLayout<text.IDocumentLayoutDef, text.IDocumentAssets>;
        layout(constraint: Size, docctx: text.IDocumentContext): Size;
        render(ctx: core.render.RenderContext, docctx: text.IDocumentContext): any;
        setMaxWidth(width: number, docctx: text.IDocumentContext): any;
        setAvailableWidth(width: number): any;
        getHorizontalOffset(docctx: text.IDocumentContext): number;
        walkText(): IWalker<text.TextUpdater>;
        onTextAttached(child: text.TextUpdater): any;
        onTextDetached(child: text.TextUpdater): any;
    }
    class TextBlockUpdaterTree extends core.UpdaterTree implements ITextBlockUpdaterTree {
        doc: text.IDocumentLayout<text.IDocumentLayoutDef, text.IDocumentAssets>;
        children: text.TextUpdater[];
        setMaxWidth(width: number, docctx: text.IDocumentContext): boolean;
        layout(constraint: Size, docctx: text.IDocumentContext): Size;
        render(ctx: core.render.RenderContext, docctx: text.IDocumentContext): void;
        setAvailableWidth(width: number): void;
        getHorizontalOffset(docctx: text.IDocumentContext): number;
        clearText(): void;
        walkText(): IWalker<text.TextUpdater>;
        onTextAttached(child: text.TextUpdater, index?: number): void;
        onTextDetached(child: text.TextUpdater): void;
    }
}
declare module minerva.controls.textboxview {
    class Blinker {
        isEnabled: boolean;
        isVisible: boolean;
        private $$blink_delay;
        private $$timeout;
        private $$onChange;
        constructor(onChange: (isVisible: boolean) => void);
        delay(): void;
        begin(): void;
        end(): void;
        private $connect(multiplier);
        private $disconnect();
        private $blink();
        private $show();
        private $hide();
    }
}
declare module minerva.controls.textboxview {
    interface ITextBoxViewUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, render.IInput, text.IDocumentContext {
        isReadOnly: boolean;
        isFocused: boolean;
    }
    class TextBoxViewUpdater extends core.Updater {
        assets: ITextBoxViewUpdaterAssets;
        tree: TextBoxViewUpdaterTree;
        blinker: Blinker;
        init(): void;
        setDocument(docdef?: text.IDocumentLayoutDef): TextBoxViewUpdater;
        getCursorFromPoint(point: IPoint): number;
        invalidateFont(full?: boolean): void;
        invalidateTextMetrics(): TextBoxViewUpdater;
        invalidateMeasure(): TextBoxViewUpdater;
        invalidateCaret(): void;
        invalidateSelectionStart(): void;
        invalidateSelectionLength(switching: boolean): void;
        invalidateCaretRegion(): void;
        resetCaretBlinker(shouldDelay: boolean): void;
    }
}
declare module minerva.controls.textboxview {
    interface ITextBoxViewUpdaterTree {
        doc: text.IDocumentLayout<text.IDocumentLayoutDef, text.IDocumentAssets>;
        layout(constraint: Size, docctx: text.IDocumentContext): Size;
        render(ctx: core.render.RenderContext, docctx: text.IDocumentContext): any;
        getCaretRegion(docctx: text.IDocumentContext): Rect;
        setAvailableWidth(width: number): any;
        getHorizontalOffset(docctx: text.IDocumentContext): number;
        walkText(): IWalker<text.TextUpdater>;
        onTextAttached(child: text.TextUpdater): any;
        onTextDetached(child: text.TextUpdater): any;
    }
    class TextBoxViewUpdaterTree extends core.UpdaterTree implements ITextBoxViewUpdaterTree {
        doc: text.IDocumentLayout<text.IDocumentLayoutDef, text.IDocumentAssets>;
        children: text.TextUpdater[];
        setMaxWidth(width: number, docctx: text.IDocumentContext): boolean;
        layout(constraint: Size, docctx: text.IDocumentContext): Size;
        render(ctx: core.render.RenderContext, docctx: text.IDocumentContext): void;
        setAvailableWidth(width: number): void;
        getHorizontalOffset(docctx: text.IDocumentContext): number;
        getCaretRegion(docctx: text.IDocumentContext): Rect;
        clearText(): void;
        walkText(): IWalker<text.TextUpdater>;
        onTextAttached(child: text.TextUpdater, index?: number): void;
        onTextDetached(child: text.TextUpdater): void;
    }
}
declare module minerva.controls.usercontrol {
    interface IUserControlUpdaterAssets extends control.IControlUpdaterAssets, measure.IInput, arrange.IInput {
    }
    class UserControlUpdater extends controls.control.ControlUpdater {
        assets: IUserControlUpdaterAssets;
        init(): void;
    }
}
declare module minerva.controls.video {
    class VideoUpdater extends core.Updater {
        onSurfaceChanged(oldSurface: core.ISurface, newSurface: core.ISurface): void;
        preRender(): void;
    }
}
declare module minerva.controls.virtualizingpanel {
    class VirtualizingPanelUpdater extends panel.PanelUpdater {
        tree: VirtualizingPanelUpdaterTree;
        init(): void;
    }
}
declare module minerva.controls.virtualizingpanel {
    var NO_CONTAINER_OWNER: IVirtualizingContainerOwner;
    class VirtualizingPanelUpdaterTree extends panel.PanelUpdaterTree {
        containerOwner: IVirtualizingContainerOwner;
    }
}
declare module minerva.controls.virtualizingstackpanel {
    interface IVirtualizingStackPanelUpdaterAssets extends panel.IPanelUpdaterAssets, measure.IInput, arrange.IInput {
    }
    class VirtualizingStackPanelUpdater extends virtualizingpanel.VirtualizingPanelUpdater {
        assets: IVirtualizingStackPanelUpdaterAssets;
        init(): void;
    }
}
declare module minerva.path.segments {
    interface IArc extends IPathSegment {
        x: number;
        y: number;
        radius: number;
        sAngle: number;
        eAngle: number;
        aClockwise: boolean;
    }
    function arc(x: number, y: number, radius: number, sa: number, ea: number, cc: boolean): IArc;
}
declare function radToDegrees(rad: any): number;
declare module minerva.path.segments {
    interface IArcTo extends IPathSegment {
        cpx: number;
        cpy: number;
        x: number;
        y: number;
        radius: number;
    }
    function arcTo(cpx: number, cpy: number, x: number, y: number, radius: number): IArcTo;
}
declare module minerva.path.segments {
    interface IClose extends IPathSegment {
        isClose: boolean;
    }
    function close(): IClose;
}
declare module minerva.path.segments {
    interface ICubicBezier extends IPathSegment {
        cp1x: number;
        cp1y: number;
        cp2x: number;
        cp2y: number;
        x: number;
        y: number;
    }
    function cubicBezier(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): ICubicBezier;
}
declare module minerva.path.segments {
    interface IEllipse extends IPathSegment {
        x: number;
        y: number;
        width: number;
        height: number;
    }
    function ellipse(x: number, y: number, width: number, height: number): IEllipse;
}
declare module minerva.path.segments {
    interface IEllipticalArc extends IPathSegment {
        rx: number;
        ry: number;
        rotationAngle: number;
        isLargeArcFlag: boolean;
        sweepDirectionFlag: SweepDirection;
        ex: number;
        ey: number;
    }
    function ellipticalArc(rx: number, ry: number, rotationAngle: number, isLargeArcFlag: boolean, sweepDirectionFlag: SweepDirection, ex: number, ey: number): IEllipticalArc;
}
declare module minerva.path.segments {
    interface ILine extends IPathSegment {
        x: number;
        y: number;
    }
    function line(x: number, y: number): ILine;
}
declare module minerva.path.segments {
    interface IMove extends IPathSegment {
        x: number;
        y: number;
        isMove: boolean;
    }
    function move(x: number, y: number): IMove;
}
declare module minerva.path.segments {
    interface IQuadraticBezier extends IPathSegment {
        cpx: number;
        cpy: number;
        x: number;
        y: number;
    }
    function quadraticBezier(cpx: number, cpy: number, x: number, y: number): IQuadraticBezier;
}
declare module minerva.path.segments {
    interface IRect extends IPathSegment {
        x: number;
        y: number;
        width: number;
        height: number;
    }
    function rect(x: number, y: number, width: number, height: number): IRect;
}
declare module minerva.path.segments {
    function roundedRect(x: number, y: number, width: number, height: number, radiusX: number, radiusY: number): IRect;
}
interface CanvasRenderingContext2D {
    backingStorePixelRatio: number;
}
interface CanvasRenderingContext2D {
    ellipse(x: number, y: number, radiusX: number, radiusY: number, rotation: number, startAngle: number, endAngle: number, antiClockwise?: boolean): any;
}
interface CanvasRenderingContext2D {
    isPointInStroke(x: number, y: number): boolean;
}
declare module minerva.shapes.shape {
    interface IShapeUpdaterAssets extends core.IUpdaterAssets, measure.IInput, arrange.IInput, processup.IInput, render.IInput {
    }
    class ShapeUpdater extends core.Updater {
        assets: IShapeUpdaterAssets;
        init(): void;
        invalidateNaturalBounds(): void;
    }
}
declare module minerva.shapes.ellipse {
    interface IEllipseUpdaterAssets extends shape.IShapeUpdaterAssets, render.IInput {
    }
    class EllipseUpdater extends shape.ShapeUpdater {
        assets: IEllipseUpdaterAssets;
        init(): void;
    }
}
declare module minerva.shapes.path {
    interface IPathUpdaterAssets extends shape.IShapeUpdaterAssets, measure.IInput, processup.IInput, render.IInput {
    }
    class PathUpdater extends shape.ShapeUpdater {
        assets: IPathUpdaterAssets;
        init(): void;
    }
}
declare module minerva.shapes.line {
    interface ILineUpdaterAssets extends path.IPathUpdaterAssets, measure.IInput {
    }
    class LineUpdater extends path.PathUpdater {
        assets: ILineUpdaterAssets;
        init(): void;
        invalidatePath(): void;
    }
}
declare module minerva.shapes.path {
    class AnonPathGeometry implements IPathGeometry {
        old: boolean;
        path: minerva.path.Path;
        fillRule: FillRule;
        Draw(ctx: minerva.core.render.RenderContext): void;
        GetBounds(pars?: minerva.path.IStrokeParameters): Rect;
    }
}
declare module minerva.shapes.path {
    interface IPathGeometry {
        fillRule: FillRule;
        Draw(ctx: minerva.core.render.RenderContext): any;
        GetBounds(pars?: minerva.path.IStrokeParameters): Rect;
    }
}
declare module minerva.shapes.polyline {
    interface IPolylineUpdaterAssets extends path.IPathUpdaterAssets, measure.IInput {
    }
    class PolylineUpdater extends path.PathUpdater {
        assets: IPolylineUpdaterAssets;
        init(): void;
        invalidateFillRule(): void;
        invalidatePath(): void;
    }
}
declare module minerva.shapes.polygon {
    class PolygonUpdater extends polyline.PolylineUpdater {
        init(): void;
    }
}
declare module minerva.shapes.rectangle {
    interface IRectangleUpdaterAssets extends shape.IShapeUpdaterAssets, render.IInput {
    }
    class RectangleUpdater extends shape.ShapeUpdater {
        assets: IRectangleUpdaterAssets;
        init(): void;
    }
}
declare module minerva.shapes.shape {
    interface IShapeProperties {
        fill: IBrush;
        stretch: Stretch;
        stroke: IBrush;
        strokeThickness: number;
        strokeDashArray: number[];
        strokeDashCap: PenLineCap;
        strokeDashOffset: number;
        strokeEndLineCap: PenLineCap;
        strokeLineJoin: PenLineJoin;
        strokeMiterLimit: number;
        strokeStartLineCap: PenLineCap;
    }
}
declare module minerva.text.layout {
    class Cluster {
        isSelected: boolean;
        text: string;
        width: number;
        static DEFAULT_SELECTION_BG: FakeBrush;
        static DEFAULT_SELECTION_FG: FakeBrush;
        static render(cluster: Cluster, assets: ITextAssets, ctx: core.render.RenderContext): void;
    }
}
declare module minerva.text.layout {
    class Line {
        runs: Run[];
        width: number;
        height: number;
        static getLineFromY(lines: Line[], y: number): Line;
        static elliptify(docctx: IDocumentContext, docassets: IDocumentAssets, line: layout.Line, measureTextWidth: (text: string, font: Font) => number): boolean;
    }
}
declare module minerva.text.layout {
    class Run {
        attrs: ITextAssets;
        text: string;
        start: number;
        length: number;
        width: number;
        pre: Cluster;
        sel: Cluster;
        post: Cluster;
        static splitSelection(run: Run, start: number, end: number, measureWidth: (text: string, assets: ITextAssets) => number): void;
        static elliptify(run: Run, available: number, textTrimming: TextTrimming, measureTextWidth: (text: string, font: Font) => number): void;
    }
}
declare module minerva.text.run {
    class RunLayoutDef implements ITextLayoutDef {
        layout(docctx: IDocumentContext, docassets: IDocumentAssets, assets: ITextAssets): boolean;
    }
}
declare module minerva.text.run {
    function doLayoutNoWrap(docctx: IDocumentContext, docassets: IDocumentAssets, assets: ITextAssets): void;
}
declare module minerva.text.run {
    function doLayoutWrap(docctx: IDocumentContext, docassets: IDocumentAssets, assets: ITextAssets): void;
}
