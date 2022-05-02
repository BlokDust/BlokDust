/// <reference path="../Core/FrameworkElement.ts" />
/// <reference path="../Markup/Creator.ts" />

module Fayde.Controls {
    var fmd = Markup.CreateXaml("<DataTemplate xmlns=\"" + Fayde.XMLNS + "\"><Grid><TextBlock Text=\"{Binding}\" /></Grid></DataTemplate>"
        , Fayde.XMLNS + "/contentpresenter/default");
    var fallbackTemplate: DataTemplate;
    function getFallbackTemplate (app: Application): DataTemplate {
        return fallbackTemplate = fallbackTemplate || Markup.Load<DataTemplate>(app, fmd);
    }

    export class ContentPresenterNode extends FENode {
        private _ContentRoot: UIElement;
        get ContentRoot(): UIElement { return this._ContentRoot; }

        XObject: ContentPresenter;
        constructor(xobj: ContentPresenter) {
            super(xobj);
        }

        DoApplyTemplateWithError(error: BError): boolean {
            if (this._ContentRoot)
                return false;

            var xobj = this.XObject;
            // This is meant to create {TemplateBinding ...} as a convenience when user doesn't
            // This really should check for a value or an expression
            if (xobj.TemplateOwner instanceof ContentControl) {
                if (!xobj.HasValueOrExpression(ContentPresenter.ContentProperty)) {
                    xobj.SetValue(ContentPresenter.ContentProperty, new TemplateBindingExpression("Content"));
                }
                if (!xobj.HasValueOrExpression(ContentPresenter.ContentTemplateProperty)) {
                    xobj.SetValue(ContentPresenter.ContentTemplateProperty, new TemplateBindingExpression("ContentTemplate"));
                }
            }

            var content = xobj.Content;
            if (content instanceof UIElement) {
                this._ContentRoot = content;
                xobj.DataContext = undefined;
            } else {
                xobj.DataContext = content == null ? null : content;
                this._ContentRoot = this._GetContentTemplate(content ? content.constructor : null).GetVisualTree(xobj);
            }

            if (!this._ContentRoot)
                return false;

            return this.AttachVisualChild(this._ContentRoot, error);
        }

        ClearRoot() {
            if (this._ContentRoot)
                this.DetachVisualChild(this._ContentRoot, null);
            this._ContentRoot = null;
        }

        _ContentChanged(args: IDependencyPropertyChangedEventArgs) {
            var isUIContent = args.NewValue instanceof UIElement;
            if (isUIContent || args.OldValue instanceof UIElement) {
                this.ClearRoot();
            } else if (!isUIContent) {
                if (this._ShouldInvalidateImplicitTemplate(args.OldValue, args.NewValue))
                    this.ClearRoot();
                this.XObject.DataContext = args.NewValue == null ? null : args.NewValue;
            }
            this.LayoutUpdater.invalidateMeasure();
        }
        _ContentTemplateChanged() {
            this.ClearRoot();
            this.LayoutUpdater.invalidateMeasure();
        }

        private _ShouldInvalidateImplicitTemplate(oldValue: any, newValue: any): boolean {
            //NOTE: If we are using an implicit data template, we need to make sure we invalidate when Content changes
            var octor = oldValue ? oldValue.constructor : null;
            var nctor = newValue ? newValue.constructor : null;
            if (octor !== nctor)
                return true;
            if (octor === Object)
                return true;
            return false;
        }

        private _GetContentTemplate(type: Function): DataTemplate {
            var dt = this.XObject.ContentTemplate;
            if (dt)
                return dt;

            if (type && typeof type === "function") {
                //Traverse logical tree looking in Resources for implicitly typed DataTemplate
                var node = <XamlNode>this;
                var rd: ResourceDictionary;
                while (node) {
                    var xobj = node.XObject;
                    if (xobj instanceof FrameworkElement && (rd = (<FrameworkElement>xobj).Resources)) {
                        dt = rd.Get(type);
                        if (dt instanceof DataTemplate)
                            return dt;
                    }
                    node = node.ParentNode;
                }
                var surface = <Surface>this.LayoutUpdater.tree.surface;
                var app = surface ? surface.App : null;
                if (app) {
                    dt = app.Resources.Get(type);
                    if (dt instanceof DataTemplate)
                        return dt;
                }
            }

            return getFallbackTemplate(this.XObject.App);
        }
    }

    export class ContentPresenter extends FrameworkElement {
        XamlNode: ContentPresenterNode;
        CreateNode(): ContentPresenterNode { return new ContentPresenterNode(this); }

        static ContentProperty = DependencyProperty.Register("Content", () => Object, ContentPresenter, undefined, (d: ContentPresenter, args) => d.XamlNode._ContentChanged(args));
        static ContentTemplateProperty = DependencyProperty.Register("ContentTemplate", () => DataTemplate, ContentPresenter, undefined, (d: ContentPresenter, args) => d.XamlNode._ContentTemplateChanged());
        Content: any;
        ContentTemplate: DataTemplate;
    }
    Fayde.CoreLibrary.add(ContentPresenter);
    Markup.Content(ContentPresenter, ContentPresenter.ContentProperty);
}