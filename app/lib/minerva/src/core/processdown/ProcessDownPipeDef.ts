module minerva.core.processdown {
    export interface IProcessDownTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree):boolean;
    }
    export interface IInput extends pipe.IPipeInput {
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
    export interface IState extends pipe.IPipeState {
        xformOrigin: Point;
        localXform: number[];
        subtreeDownDirty: DirtyFlags;
    }
    export interface IOutput extends pipe.IPipeOutput {
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

    export class ProcessDownPipeDef extends pipe.TriPipeDef<IProcessDownTapin, IInput, IState, IOutput> {
        constructor () {
            super();
            this.addTapin('processRenderVisibility', tapins.processRenderVisibility)
                .addTapin('processHitTestVisibility', tapins.processHitTestVisibility)
                .addTapin('calcXformOrigin', tapins.calcXformOrigin)
                .addTapin('processLocalXform', tapins.processLocalXform)
                .addTapin('calcRenderXform', tapins.calcRenderXform)
                .addTapin('calcAbsoluteXform', tapins.calcAbsoluteXform)
                .addTapin('processXform', tapins.processXform)
                .addTapin('processLayoutClip', tapins.processLayoutClip)
                .addTapin('propagateDirtyToChildren', tapins.propagateDirtyToChildren);
        }

        createState (): IState {
            return {
                xformOrigin: new Point(),
                localXform: mat3.identity(),
                subtreeDownDirty: 0
            };
        }

        createOutput (): IOutput {
            return {
                totalIsRenderVisible: false,
                totalOpacity: 1.0,
                totalIsHitTestVisible: false,
                z: NaN,
                compositeLayoutClip: new Rect(),
                renderXform: mat3.identity(),
                absoluteXform: mat3.identity(),
                dirtyFlags: 0,
                newUpDirty: 0
            };
        }

        prepare (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree) {
            if ((input.dirtyFlags & DirtyFlags.LocalTransform) > 0) {
                input.dirtyFlags |= DirtyFlags.Transform;
            }
            output.dirtyFlags = input.dirtyFlags;
            output.totalIsRenderVisible = input.totalIsRenderVisible;
            output.totalOpacity = input.totalOpacity;
            output.totalIsHitTestVisible = input.totalIsHitTestVisible;
            output.z = input.z;
            Rect.copyTo(input.compositeLayoutClip, output.compositeLayoutClip);
            mat3.copyTo(input.renderXform, output.renderXform);
            mat3.copyTo(input.absoluteXform, output.absoluteXform);
            state.subtreeDownDirty = 0;
        }

        flush (input: IInput, state: IState, output: IOutput, vpinput: IInput, tree: core.IUpdaterTree) {
            output.newUpDirty = (output.dirtyFlags & ~input.dirtyFlags) & DirtyFlags.UpDirtyState;
            input.dirtyFlags = output.dirtyFlags & ~DirtyFlags.DownDirtyState;
            input.totalIsRenderVisible = output.totalIsRenderVisible;
            input.totalOpacity = output.totalOpacity;
            input.totalIsHitTestVisible = output.totalIsHitTestVisible;
            input.z = output.z;
            Rect.copyTo(output.compositeLayoutClip, input.compositeLayoutClip);
            mat3.copyTo(output.renderXform, input.renderXform);
            mat3.copyTo(output.absoluteXform, input.absoluteXform);
        }
    }
}