module minerva.core.arrange.tapins {
    export var calcVisualOffset: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        var vo = output.visualOffset;
        var fr = state.finalRect;
        var constrained = state.constrained;
        vo.x = fr.x;
        vo.y = fr.y;

        if (!tree.isTop) {
            switch (input.horizontalAlignment) {
                case HorizontalAlignment.Left:
                    break;
                case HorizontalAlignment.Right:
                    vo.x += fr.width - constrained.width;
                    break;
                case HorizontalAlignment.Center:
                    vo.x += (fr.width - constrained.width) * 0.5;
                    break;
                default:
                    vo.x += Math.max((fr.width - constrained.width) * 0.5, 0);
                    break;
            }

            switch (input.verticalAlignment) {
                case VerticalAlignment.Top:
                    break;
                case VerticalAlignment.Bottom:
                    vo.y += fr.height - constrained.height;
                    break;
                case VerticalAlignment.Center:
                    vo.y += (fr.height - constrained.height) * 0.5;
                    break;
                default:
                    vo.y += Math.max((fr.height - constrained.height) * 0.5, 0);
                    break;
            }
        }

        if (input.useLayoutRounding) {
            vo.x = Math.round(vo.x);
            vo.y = Math.round(vo.y);
        }

        return true;
    };
}