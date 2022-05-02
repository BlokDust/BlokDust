module minerva.controls.scrollcontentpresenter.arrange.tapins {
    export function updateClip (input: IInput, state: IState, output: IOutput, tree: core.UpdaterTree, availableSize: Size): boolean {
        var ic = output.internalClip;
        ic.x = ic.y = 0;
        Size.copyTo(state.arrangedSize, ic);

        //TODO: Clip for TextBox/RichTextBox

        return true;
    }

    /*
    function _CalculateTextBoxClipRect (arrangeSize: minerva.Size): minerva.Rect {
        var left = 0;
        var right = 0;
        var sd = this._ScrollData;
        var width = sd.ExtentWidth;
        var num = sd.ViewportWidth;
        var x = sd.OffsetX;
        var templatedParent: ScrollViewer;
        if (this.TemplateOwner instanceof ScrollViewer)
            templatedParent = <ScrollViewer>this.TemplateOwner;

        var to = templatedParent.TemplateOwner;
        var textWrapping = TextWrapping.NoWrap;
        var horizontalScrollBarVisibility = ScrollBarVisibility.Disabled;
        if (to instanceof TextBox) {
            var textbox = <TextBox>to;
            textWrapping = textbox.TextWrapping;
            horizontalScrollBarVisibility = textbox.HorizontalScrollBarVisibility;
        } else if (to instanceof RichTextBox) {
            var richtextbox = <RichTextBox>to;
            textWrapping = richtextbox.TextWrapping;
            horizontalScrollBarVisibility = richtextbox.HorizontalScrollBarVisibility;
        }

        var padding = templatedParent.Padding;
        if (textWrapping !== TextWrapping.Wrap) {
            if (num > width || x === 0)
                left = padding.left + 1;
            if (num > width || horizontalScrollBarVisibility !== ScrollBarVisibility.Disabled && Math.abs(width - x + num) <= 1)
                right = padding.right + 1;
        } else {
            left = padding.left + 1;
            right = padding.right + 1;
        }
        left = Math.max(0, left);
        right = Math.max(0, right);
        return new minerva.Rect(-left, 0, arrangeSize.width + left + right, arrangeSize.height);
    }
    */
}