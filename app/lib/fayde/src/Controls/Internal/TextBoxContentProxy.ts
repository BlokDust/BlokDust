module Fayde.Controls.Internal {
    export class TextBoxContentProxy {
        private $$element: FrameworkElement = null;

        setElement(fe: FrameworkElement, view: TextBoxView) {
            this.$$element = fe;
            if (!fe)
                return;

            if (fe instanceof ContentPresenter) {
                (<ContentPresenter>fe).SetValue(ContentPresenter.ContentProperty, view);
            } else if (fe instanceof ContentControl) {
                (<ContentControl>fe).SetValue(ContentControl.ContentProperty, view);
            } else if (fe instanceof Border) {
                (<Border>fe).SetValue(Border.ChildProperty, view);
            } else if (fe instanceof Panel) {
                (<Panel>fe).Children.Add(view);
            } else {
                console.warn("TextBox does not have a valid content element.");
            }
        }

        setHorizontalScrollBar(sbvis: ScrollBarVisibility) {
            var ce = this.$$element;
            if (!ce)
                return;
            var ceType = (<any>ce).constructor;
            var propd = DependencyProperty.GetDependencyProperty(ceType, "HorizontalScrollBarVisibility", true);
            if (!propd)
                return;
            ce.SetValueInternal(propd, sbvis);
        }

        setVerticalScrollBar(sbvis: ScrollBarVisibility) {
            var ce = this.$$element;
            if (!ce)
                return;
            var ceType = (<any>ce).constructor;
            var propd = DependencyProperty.GetDependencyProperty(ceType, "VerticalScrollBarVisibility", true);
            if (!propd)
                return;
            ce.SetValueInternal(propd, sbvis);
        }
    }
}