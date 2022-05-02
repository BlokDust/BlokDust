module minerva.core.render {
    export interface IRenderTapin extends pipe.ITriTapin {
        (input: IInput, state: IState, output: IOutput, ctx: RenderContext, region: Rect, tree: IUpdaterTree):boolean;
    }
    export interface IInput extends pipe.IPipeInput {
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
    export interface IState extends pipe.IPipeState {
        renderRegion: Rect;
    }
    export interface IOutput extends pipe.IPipeOutput {

    }

    export class RenderPipeDef extends pipe.TriPipeDef<IRenderTapin, IInput, IState, IOutput> {
        constructor () {
            super();
            this.addTapin('validate', tapins.validate)
                .addTapin('validateRegion', tapins.validateRegion)
                .addTapin('prepareContext', tapins.prepareContext)
                .addTapin('applyClip', tapins.applyClip)
                .addTapin('preRender', tapins.preRender)
                .addTapin('doRender', tapins.doRender)
                .addTapin('postRender', tapins.postRender)
                .addTapin('renderChildren', tapins.renderChildren)
                .addTapin('restoreContext', tapins.restoreContext);
        }

        createState (): IState {
            return {
                renderRegion: new Rect()
            };
        }

        createOutput (): IOutput {
            return {};
        }
    }
}