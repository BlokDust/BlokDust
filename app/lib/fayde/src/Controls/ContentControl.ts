/// <reference path="Control.ts" />

module Fayde.Controls {
    export class ContentControlNode extends ControlNode {
        private _DefaultPresenter: ContentPresenter = null;

        XObject: ContentControl;

        constructor (xobj: ContentControl) {
            super(xobj);
        }

        GetDefaultVisualTree (): UIElement {
            var xobj = this.XObject;
            var content = xobj.Content;
            if (content instanceof UIElement)
                return <UIElement>content;

            var presenter = this._DefaultPresenter;
            if (!presenter) {
                presenter = this._DefaultPresenter = new ContentPresenter();
                presenter.TemplateOwner = this.XObject;
            }
            presenter.SetValue(ContentPresenter.ContentProperty, new TemplateBindingExpression("Content"));
            presenter.SetValue(ContentPresenter.ContentTemplateProperty, new TemplateBindingExpression("ContentTemplate"));
            return presenter;
        }

        OnContentChanged (o: any, n: any) {
            if (o instanceof UIElement || n instanceof UIElement)
                this.CleanOldContent(o);
        }

        OnTemplateChanged (oldTemplate: ControlTemplate, newTemplate: ControlTemplate) {
            if (oldTemplate)
                this.CleanOldContent(this.XObject.Content);
            super.OnTemplateChanged(oldTemplate, newTemplate);
        }

        private CleanOldContent (content: any) {
            if (content instanceof UIElement) {
                FENode.DetachFromVisualParent(content);
                this.LayoutUpdater.invalidateMeasure();
            } else {
                var presenter = this._DefaultPresenter;
                if (presenter) {
                    presenter.ClearValue(ContentPresenter.ContentProperty);
                    presenter.ClearValue(ContentPresenter.ContentTemplateProperty);
                    FENode.DetachFromVisualParent(presenter);
                    this.LayoutUpdater.invalidateMeasure();
                }
            }
        }
    }

    export class ContentControl extends Control {
        XamlNode: ContentControlNode;

        CreateNode (): ContentControlNode {
            return new ContentControlNode(this);
        }

        static ContentProperty = DependencyProperty.Register("Content", () => Object, ContentControl, undefined, (d: ContentControl, args) => d.OnContentPropertyChanged(args));
        static ContentTemplateProperty = DependencyProperty.Register("ContentTemplate", () => DataTemplate, ContentControl, undefined, (d: ContentControl, args) => d.OnContentTemplateChanged(args.OldValue, args.NewValue));
        static ContentUriProperty = DependencyProperty.Register("ContentUri", () => Uri, ContentControl, undefined, (d: ContentControl, args) => d.OnContentUriPropertyChanged(args));
        Content: any;
        ContentTemplate: DataTemplate;
        ContentUri: Uri;

        private OnContentPropertyChanged (args: DependencyPropertyChangedEventArgs) {
            this.XamlNode.OnContentChanged(args.OldValue, args.NewValue);
            this.OnContentChanged(args.OldValue, args.NewValue);
        }

        private OnContentUriPropertyChanged (args: DependencyPropertyChangedEventArgs) {
            var oldUri: Uri;
            if (args.OldValue instanceof Uri) {
                this.Content = undefined;
                oldUri = <Uri>args.OldValue;
            }
            var newUri: Uri;
            if (args.NewValue instanceof Uri) {
                newUri = <Uri>args.NewValue;
                Markup.Resolve(newUri)
                    .then(m => this._OnLoadedUri(m), err => this._OnErroredUri(err, newUri))
            }
            this.OnContentUriChanged(oldUri, newUri);
        }

        constructor () {
            super();
            this.DefaultStyleKey = ContentControl;
        }

        OnContentChanged (oldContent: any, newContent: any) {
        }

        OnContentTemplateChanged (oldContentTemplate: DataTemplate, newContentTemplate: DataTemplate) {
        }

        OnContentUriChanged (oldSourceUri: Uri, newSourceUri: Uri) {
        }

        private _OnLoadedUri (xm: nullstone.markup.Markup<any>) {
            this.Content = Markup.Load(this.App, xm);
        }

        private _OnErroredUri (err: any, src: Uri) {
            console.warn("Error resolving XamlResource: '" + src.toString() + "'.");
            //TODO: Set content to error message?
        }
    }
    Fayde.CoreLibrary.add(ContentControl);
    Markup.Content(ContentControl, ContentControl.ContentProperty);
}