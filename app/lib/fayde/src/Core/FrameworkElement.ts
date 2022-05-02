/// <reference path="UIElement.ts" />
/// <reference path="Providers/ResourcesStore.ts" />
/// <reference path="Providers/ActualSizeStore.ts" />

module Fayde {
    export class FENode extends UINode implements Providers.IStyleHolder, Providers.IImplicitStyleHolder {
        _LocalStyle: Style;
        _ImplicitStyles: Style[];
        _StyleMask: number;

        XObject: FrameworkElement;
        constructor(xobj: FrameworkElement) {
            super(xobj);
            var lu = this.LayoutUpdater;
            lu.tree.setTemplateApplier(() => {
                var error = new BError();
                var result = this.ApplyTemplateWithError(error);
                if (error.Message)
                    error.ThrowException();
                return result;
            });
            lu.setSizeUpdater({
                setActualWidth (value: number) {
                    xobj.SetCurrentValue(FrameworkElement.ActualWidthProperty, value);
                },
                setActualHeight (value: number) {
                    xobj.SetCurrentValue(FrameworkElement.ActualHeightProperty, value);
                },
                onSizeChanged (oldSize: minerva.Size, newSize: minerva.Size) {
                    xobj.SizeChanged.raise(xobj, new SizeChangedEventArgs(oldSize, newSize));
                }
            });
        }
        SubtreeNode: XamlNode;
        SetSubtreeNode(subtreeNode: XamlNode, error: BError): boolean {
            if (this.SubtreeNode) {
                this.SubtreeNode.Detach();
                this.SubtreeNode = null;
            }
            if (subtreeNode && !subtreeNode.AttachTo(this, error))
                return false;
            this.SubtreeNode = subtreeNode;
            return true;
        }

        GetInheritedEnumerator(): nullstone.IEnumerator<DONode> {
            return this.GetVisualTreeEnumerator();
        }

        GetVisualTreeEnumerator(): nullstone.IEnumerator<FENode> {
            var walker = this.LayoutUpdater.tree.walk();
            return {
                current: undefined,
                moveNext: function() {
                    if (!walker.step())
                        return false;
                    this.current = walker.current.getAttachedValue("$node");
                    return true;
                }
            };
        }

        SetIsLoaded(value: boolean) {
            if (this.IsLoaded === value)
                return;
            this.IsLoaded = value;
            this.OnIsLoadedChanged(value);
        }
        OnIsLoadedChanged(newIsLoaded: boolean) {
            var xobj = this.XObject;
            var res = xobj.Resources;
            if (!newIsLoaded) {
                Providers.ImplicitStyleBroker.Clear(xobj, Providers.StyleMask.VisualTree);
                xobj.Unloaded.raise(xobj, new RoutedEventArgs());
                //TODO: Should we set is loaded on resources that are FrameworkElements?
            } else {
                Providers.ImplicitStyleBroker.Set(xobj, Providers.StyleMask.All);
            }
            for (var en = this.GetVisualTreeEnumerator(); en.moveNext();) {
                en.current.SetIsLoaded(newIsLoaded);
            }
            if (newIsLoaded) {
                //TODO: Should we set is loaded on resources that are FrameworkElements?
                xobj.Loaded.raise(xobj, new RoutedEventArgs());
                this.InvokeLoaded();
                //LOOKS USELESS: 
                //Providers.DataContextStore.EmitDataContextChanged(xobj);
            }
        }
        InvokeLoaded() { }

        AttachVisualChild(uie: UIElement, error: BError): boolean {
            this.OnVisualChildAttached(uie);
            if (!this.SetSubtreeNode(uie.XamlNode, error))
                return false;
            uie.XamlNode.SetIsLoaded(this.IsLoaded);
            return true;
        }
        DetachVisualChild(uie: UIElement, error: BError) {
            if (!this.SetSubtreeNode(null, error))
                return false;
            this.OnVisualChildDetached(uie);
            uie.XamlNode.SetIsLoaded(false);
            return true;
        }

        ApplyTemplateWithError(error: BError): boolean {
            if (this.SubtreeNode)
                return false;
            var result = this.DoApplyTemplateWithError(error);
            var xobj = this.XObject;
            if (result)
                xobj.OnApplyTemplate();
            xobj.TemplateApplied.raise(xobj, null);
            return result;
        }
        DoApplyTemplateWithError(error: BError): boolean { return false; }
        FinishApplyTemplateWithError(uie: UIElement, error: BError): boolean {
            if (!uie || error.Message)
                return false;
            this.AttachVisualChild(uie, error);
            return error.Message == null;
        }

        UpdateLayout() {
            console.warn("FENode.UpdateLayout not implemented");
        }

        static DetachFromVisualParent (xobj: UIElement) {
            var vpNode = <FENode>xobj.XamlNode.VisualParentNode;
            if (vpNode instanceof FENode) {
                var err = new BError();
                vpNode.DetachVisualChild(xobj, err);
                if (err.Message)
                    err.ThrowException();
            }
        }
    }

    export class FrameworkElement extends UIElement implements IResourcable, Providers.IIsPropertyInheritable {
        XamlNode: FENode;
        CreateNode(): FENode { return new FENode(this); }

        static ActualHeightProperty = DependencyProperty.RegisterReadOnly("ActualHeight", () => Number, FrameworkElement);
        static ActualWidthProperty = DependencyProperty.RegisterReadOnly("ActualWidth", () => Number, FrameworkElement);
        static CursorProperty = DependencyProperty.Register("Cursor", () => new Enum(CursorType), FrameworkElement, CursorType.Default);
        static FlowDirectionProperty = InheritableOwner.FlowDirectionProperty.ExtendTo(FrameworkElement);
        static HeightProperty = DependencyProperty.Register("Height", () => Length, FrameworkElement, NaN);
        static HorizontalAlignmentProperty = DependencyProperty.Register("HorizontalAlignment", () => new Enum(HorizontalAlignment), FrameworkElement, HorizontalAlignment.Stretch);
        static LanguageProperty = InheritableOwner.LanguageProperty.ExtendTo(FrameworkElement);
        static MarginProperty = DependencyProperty.RegisterCore("Margin", () => Thickness, FrameworkElement);
        static MaxHeightProperty = DependencyProperty.Register("MaxHeight", () => Number, FrameworkElement, Number.POSITIVE_INFINITY);
        static MaxWidthProperty = DependencyProperty.Register("MaxWidth", () => Number, FrameworkElement, Number.POSITIVE_INFINITY);
        static MinHeightProperty = DependencyProperty.Register("MinHeight", () => Number, FrameworkElement, 0.0);
        static MinWidthProperty = DependencyProperty.Register("MinWidth", () => Number, FrameworkElement, 0.0);
        static StyleProperty = DependencyProperty.Register("Style", () => Style, FrameworkElement, undefined, (dobj, args) => Providers.LocalStyleBroker.Set(<FrameworkElement>dobj, args.NewValue));
        static VerticalAlignmentProperty = DependencyProperty.Register("VerticalAlignment", () => new Enum(VerticalAlignment), FrameworkElement, VerticalAlignment.Stretch);
        static WidthProperty = DependencyProperty.Register("Width", () => Length, FrameworkElement, NaN);
        static ResourcesProperty = DependencyProperty.Register("Resources", () => ResourceDictionary, FrameworkElement);
        static DefaultStyleKeyProperty = DependencyProperty.Register("DefaultStyleKey", () => Function, FrameworkElement);

        IsInheritable(propd: DependencyProperty): boolean {
            if (propd === FrameworkElement.FlowDirectionProperty)
                return true;
            if (propd === FrameworkElement.LanguageProperty)
                return true;
            return super.IsInheritable(propd);
        }

        ActualHeight: number;
        ActualWidth: number;
        FlowDirection: FlowDirection;
        Height: number;
        HorizontalAlignment: HorizontalAlignment;
        Language: string;
        Margin: Thickness;
        MaxWidth: number;
        MaxHeight: number;
        MinWidth: number;
        MinHeight: number;
        Style: Style;
        VerticalAlignment: VerticalAlignment;
        Width: number;
        Resources: ResourceDictionary;
        DefaultStyleKey: Function;

        SizeChanged = new RoutedEvent<RoutedEventArgs>();
        Loaded = new RoutedEvent<RoutedEventArgs>();
        Unloaded = new RoutedEvent<RoutedEventArgs>();
        LayoutUpdated = new nullstone.Event<nullstone.IEventArgs>();

        OnApplyTemplate() { }
        TemplateApplied = new nullstone.Event<nullstone.IEventArgs>();

        OnBindingValidationError (args: Validation.ValidationErrorEventArgs) {
            this.BindingValidationError.raise(this, args);
        }
        BindingValidationError = new nullstone.Event<Validation.ValidationErrorEventArgs>();

        UpdateLayout() { this.XamlNode.UpdateLayout(); }
    }
    Fayde.CoreLibrary.add(FrameworkElement);

    FrameworkElement.ActualWidthProperty.Store = Providers.ActualSizeStore.Instance;
    FrameworkElement.ActualHeightProperty.Store = Providers.ActualSizeStore.Instance;
    FrameworkElement.ResourcesProperty.Store = Providers.ResourcesStore.Instance;

    module reactions {
        UIReaction<number>(FrameworkElement.WidthProperty, minerva.core.reactTo.width, false);
        UIReaction<number>(FrameworkElement.HeightProperty, minerva.core.reactTo.height, false);
        UIReaction<number>(FrameworkElement.MaxWidthProperty, minerva.core.reactTo.maxWidth, false);
        UIReaction<number>(FrameworkElement.MaxHeightProperty, minerva.core.reactTo.maxHeight, false);
        UIReaction<number>(FrameworkElement.MinWidthProperty, minerva.core.reactTo.minWidth, false);
        UIReaction<number>(FrameworkElement.MinHeightProperty, minerva.core.reactTo.minHeight, false);
        UIReaction<Thickness>(FrameworkElement.MarginProperty, minerva.core.reactTo.margin, false, minerva.Thickness.copyTo);
        UIReaction<minerva.HorizontalAlignment>(FrameworkElement.HorizontalAlignmentProperty, minerva.core.reactTo.horizontalAlignment, false);
        UIReaction<minerva.VerticalAlignment>(FrameworkElement.VerticalAlignmentProperty, minerva.core.reactTo.verticalAlignment, false);
    }
}