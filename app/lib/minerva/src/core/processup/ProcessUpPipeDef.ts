module minerva.core.processup {
    export interface IProcessUpTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, tree: core.IUpdaterTree):boolean;
    }
    export interface IInput extends pipe.IPipeInput {
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
    export interface IState extends pipe.IPipeState {
        actualSize: Size;
        invalidateSubtreePaint: boolean;
        hasNewBounds: boolean;
        hasInvalidate: boolean;
    }
    export interface IOutput extends pipe.IPipeOutput {
        extents: Rect;
        extentsWithChildren: Rect;
        globalBoundsWithChildren: Rect;
        surfaceBoundsWithChildren: Rect;
        dirtyFlags: DirtyFlags;
        dirtyRegion: Rect;
        forceInvalidate: boolean;
    }


    export class ProcessUpPipeDef extends pipe.TriPipeDef<IProcessUpTapin, IInput, IState, IOutput> {
        constructor () {
            super();
            this.addTapin('calcActualSize', tapins.calcActualSize)
                .addTapin('calcExtents', tapins.calcExtents)
                .addTapin('calcPaintBounds', tapins.calcPaintBounds)
                .addTapin('processBounds', tapins.processBounds)
                .addTapin('processNewBounds', tapins.processNewBounds)
                .addTapin('processInvalidate', tapins.processInvalidate);
        }

        createState (): IState {
            return {
                invalidateSubtreePaint: false,
                actualSize: new Size(),
                hasNewBounds: false,
                hasInvalidate: false
            };
        }

        createOutput (): IOutput {
            return {
                extents: new Rect(),
                extentsWithChildren: new Rect(),
                globalBoundsWithChildren: new Rect(),
                surfaceBoundsWithChildren: new Rect(),
                dirtyFlags: 0,
                dirtyRegion: new Rect(),
                forceInvalidate: false
            };
        }

        prepare (input: IInput, state: IState, output: IOutput) {
            output.dirtyFlags = input.dirtyFlags;
            Rect.copyTo(input.extents, output.extents);
            Rect.copyTo(input.extentsWithChildren, output.extentsWithChildren);
            Rect.copyTo(input.globalBoundsWithChildren, output.globalBoundsWithChildren);
            Rect.copyTo(input.surfaceBoundsWithChildren, output.surfaceBoundsWithChildren);
            Rect.copyTo(input.dirtyRegion, output.dirtyRegion);
            output.forceInvalidate = input.forceInvalidate;
        }

        flush (input: IInput, state: IState, output: IOutput) {
            input.dirtyFlags = output.dirtyFlags & ~DirtyFlags.UpDirtyState;
            Rect.copyTo(output.extents, input.extents);
            Rect.copyTo(output.extentsWithChildren, input.extentsWithChildren);
            Rect.copyTo(output.globalBoundsWithChildren, input.globalBoundsWithChildren);
            Rect.copyTo(output.surfaceBoundsWithChildren, input.surfaceBoundsWithChildren);
            Rect.copyTo(output.dirtyRegion, input.dirtyRegion);
            input.forceInvalidate = output.forceInvalidate;
        }
    }
}