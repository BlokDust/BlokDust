module minerva.core.arrange.tapins {
    export var calcFlip: IArrangeTapin = function (input: IInput, state: IState, output: IOutput, tree: IUpdaterTree, finalRect: Rect): boolean {
        /* TODO: IMPLEMENT
         var flipHoriz = false;
         var flowDirection = fe.FlowDirection;
         var visualParentNode = <FENode>node.VisualParentNode;
         if (visualParentNode)
         flipHoriz = visualParentNode.XObject.FlowDirection !== flowDirection;
         else if (node.ParentNode instanceof Controls.Primitives.PopupNode)
         flipHoriz = (<Controls.Primitives.PopupNode>node.ParentNode).XObject.FlowDirection !== flowDirection;
         else
         flipHoriz = flowDirection === FlowDirection.RightToLeft;
         */

        state.flipHorizontal = false;
        return true;
    };
}