/// <reference path="../../panel/render/PanelRenderPipeDef" />

module minerva.controls.grid.render {
    export interface IInput extends panel.render.IInput {
        actualWidth: number;
        actualHeight: number;
        showGridLines: boolean;
        columnDefinitions: IColumnDefinition[];
        rowDefinitions: IRowDefinition[];
    }
    export interface IState extends core.render.IState {
        framework: Size;
    }

    export class GridRenderPipeDef extends panel.render.PanelRenderPipeDef {
        constructor () {
            super();
            this.addTapinAfter('doRender', 'renderGridLines', tapins.renderGridLines);
        }

        createState() {
            var state = <IState>super.createState();
            state.framework = new Size();
            return state;
        }
    }

    export module tapins {
        export function renderGridLines (input: IInput, state: IState, output: core.render.IOutput, ctx: core.render.RenderContext, region: Rect, tree: core.IUpdaterTree): boolean {
            if (!input.showGridLines)
                return true;

            var framework = state.framework;
            framework.width = input.actualWidth;
            framework.height = input.actualHeight;
            core.helpers.coerceSize(framework, input);

            var raw = ctx.raw;
            raw.save();

            for (var cols = input.columnDefinitions, i = 0, x = 0; i < cols.length; i++) {
                x += cols[i].ActualWidth;
                raw.beginPath();
                raw.setLineDash([5]);
                raw.moveTo(x, 0);
                raw.lineTo(x, framework.height);
                raw.stroke();
            }

            for (var rows = input.rowDefinitions, i = 0, y = 0; i < rows.length; i++) {
                y += rows[i].ActualHeight;
                raw.beginPath();
                raw.setLineDash([5]);
                raw.moveTo(0, y);
                raw.lineTo(framework.width, y);
                raw.stroke();
            }

            raw.restore();

            return true;
        }
    }
}