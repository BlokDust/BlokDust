module minerva.core.arrange {
    export interface IArrangeTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect):boolean;
    }
    export interface IInput extends pipe.IPipeInput, helpers.ISized {
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
        layoutClip: Rect; //NOTE: empty represents no layout clip
        visualOffset: Point
    }
    export interface IState extends pipe.IPipeState {
        arrangedSize: Size;
        finalRect: Rect;
        finalSize: Size;
        childRect: Rect;
        framework: Size;
        stretched: Size;
        constrained: Size;
        flipHorizontal: boolean;
    }
    export interface IOutput extends pipe.IPipeOutput {
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

    export class ArrangePipeDef extends pipe.TriPipeDef<IArrangeTapin, IInput, IState, IOutput> {
        constructor () {
            super();
            this.addTapin('validateFinalRect', tapins.validateFinalRect)
                .addTapin('applyRounding', tapins.applyRounding)
                .addTapin('validateVisibility', tapins.validateVisibility)
                .addTapin('checkNeedArrange', tapins.checkNeedArrange)
                //.addTapin('ensureMeasured', tapins.ensureMeasured) -> original only runs if haven't measured for Panel
                .addTapin('invalidateFuture', tapins.invalidateFuture)
                .addTapin('calcStretched', tapins.calcStretched)
                .addTapin('prepareOverride', tapins.prepareOverride)
                .addTapin('doOverride', tapins.doOverride) //must set arrangedSize
                .addTapin('completeOverride', tapins.completeOverride)
                .addTapin('calcFlip', tapins.calcFlip)
                .addTapin('calcVisualOffset', tapins.calcVisualOffset)
                .addTapin('buildLayoutClip', tapins.buildLayoutClip)
                .addTapin('buildLayoutXform', tapins.buildLayoutXform)
                .addTapin('buildRenderSize', tapins.buildRenderSize);
        }

        createState (): IState {
            return {
                arrangedSize: new Size(),
                finalRect: new Rect(),
                finalSize: new Size(),
                childRect: new Rect(),
                framework: new Size(),
                stretched: new Size(),
                constrained: new Size(),
                flipHorizontal: false
            };
        }

        createOutput (): IOutput {
            return {
                dirtyFlags: 0,
                uiFlags: 0,
                layoutSlot: new Rect(),
                layoutXform: mat3.identity(),
                layoutClip: new Rect(),
                renderSize: new Size(),
                lastRenderSize: undefined,
                visualOffset: new Point(),
                origDirtyFlags: 0,
                origUiFlags: 0,
                newUpDirty: 0,
                newDownDirty: 0,
                newUiFlags: 0
            };
        }

        prepare (input: IInput, state: IState, output: IOutput) {
            output.origDirtyFlags = output.dirtyFlags = input.dirtyFlags;
            output.origUiFlags = output.uiFlags = input.uiFlags;

            Rect.copyTo(input.layoutSlot, output.layoutSlot);
            Rect.copyTo(input.layoutClip, output.layoutClip);
            Size.copyTo(input.renderSize, output.renderSize);
            output.lastRenderSize = input.lastRenderSize;
            mat3.copyTo(input.layoutXform, output.layoutXform);
            Point.copyTo(input.visualOffset, output.visualOffset);
        }

        flush (input: IInput, state: IState, output: IOutput) {
            var newDirty = (output.dirtyFlags | input.dirtyFlags) & ~output.origDirtyFlags;
            output.newUpDirty = newDirty & DirtyFlags.UpDirtyState;
            output.newDownDirty = newDirty & DirtyFlags.DownDirtyState;
            output.newUiFlags = (output.uiFlags | input.uiFlags) & ~output.origUiFlags;
            input.dirtyFlags = output.dirtyFlags;
            input.uiFlags = output.uiFlags;

            Rect.copyTo(output.layoutSlot, input.layoutSlot);
            Rect.copyTo(output.layoutClip, input.layoutClip);
            Size.copyTo(output.renderSize, input.renderSize);
            input.lastRenderSize = output.lastRenderSize;
            mat3.copyTo(output.layoutXform, input.layoutXform);
            Point.copyTo(output.visualOffset, input.visualOffset);
        }
    }
}