/// <reference path="../Core/FrameworkElement.ts" />
/// <reference path="../Core/Providers/IsEnabledStore.ts" />
/// <reference path="../Input/Keyboard.ts" />

module Fayde.Controls {
    export interface IIsEnabledListener {
        Callback: (newIsEnabled: boolean) => void;
        Detach();
    }

    export class ControlNode extends FENode {
        XObject: Control;
        TemplateRoot: FrameworkElement;
        IsFocused: boolean = false;
        LayoutUpdater: minerva.controls.control.ControlUpdater;

        constructor(xobj: Control) {
            super(xobj);
        }

        TabTo() {
            var xobj = this.XObject;
            return xobj.IsEnabled && xobj.IsTabStop && this.Focus();
        }

        ApplyTemplateWithError(error: BError): boolean {
            if (!super.ApplyTemplateWithError(error))
                return false;
            this.XObject.UpdateValidationState();
            return true;
        }
        DoApplyTemplateWithError(error: BError): boolean {
            var xobj = this.XObject;
            var t = xobj.Template;
            var root: UIElement;
            if (t) root = t.GetVisualTree(xobj);
            if (!root && !(root = this.GetDefaultVisualTree()))
                return false;

            if (this.TemplateRoot && this.TemplateRoot !== root)
                this.DetachVisualChild(this.TemplateRoot, error)
            this.TemplateRoot = <FrameworkElement>root;
            if (this.TemplateRoot)
                this.AttachVisualChild(this.TemplateRoot, error);
            if (error.Message)
                return false;

            //TODO: Deployment Loaded Event (Async)

            return true;
        }
        GetDefaultVisualTree(): UIElement { return undefined; }

        OnIsAttachedChanged(newIsAttached: boolean) {
            super.OnIsAttachedChanged(newIsAttached);
            if (!newIsAttached)
                Media.VSM.VisualStateManager.Deactivate(this.XObject, this.TemplateRoot);
            else
                Media.VSM.VisualStateManager.Activate(this.XObject, this.TemplateRoot);
        }

        OnParentChanged(oldParentNode: XamlNode, newParentNode: XamlNode) {
            super.OnParentChanged(oldParentNode, newParentNode);
            this.IsEnabled = newParentNode ? newParentNode.IsEnabled : true;
        }

        OnTemplateChanged(oldTemplate: ControlTemplate, newTemplate: ControlTemplate) {
            var subtree = this.SubtreeNode;
            if (subtree) {
                var error = new BError();
                if (!this.DetachVisualChild(<UIElement>subtree.XObject, error))
                    error.ThrowException();
            }
            this.LayoutUpdater.invalidateMeasure();
        }

        get IsEnabled(): boolean { return this.XObject.IsEnabled; }
        set IsEnabled(value: boolean) {
            Providers.IsEnabledStore.EmitInheritedChanged(this, value);
            this.OnIsEnabledChanged(undefined, value);
        }
        OnIsEnabledChanged(oldValue: boolean, newValue: boolean) {
            if (!newValue) {
                this.IsMouseOver = false;
                if (Surface.RemoveFocusFrom(this.XObject)) {
                    TabNavigationWalker.Focus(this, true);
                }
                this.ReleaseMouseCapture();
            }
            super.OnIsEnabledChanged(oldValue, newValue);
        }

        Focus(recurse?: boolean): boolean {
            return Surface.Focus(this.XObject, recurse);
        }

        CanCaptureMouse(): boolean { return this.XObject.IsEnabled; }
    }

    export class Control extends FrameworkElement implements Providers.IIsPropertyInheritable {
        XamlNode: ControlNode;
        CreateNode(): ControlNode { return new ControlNode(this); }
        CreateLayoutUpdater() { return new minerva.controls.control.ControlUpdater(); }

        constructor() {
            super();
            UIReaction<boolean>(Control.IsEnabledProperty, (upd, nv, ov, control?: Control) => {
                var args = {
                    Property: Control.IsEnabledProperty,
                    OldValue: ov,
                    NewValue: nv
                };
                control.OnIsEnabledChanged(args);
                if (nv !== true)
                    control.XamlNode.IsMouseOver = false;
                control.UpdateVisualState();
                control.IsEnabledChanged.raiseAsync(control, args);
            }, false, true, this);
            //TODO: Do these make sense? These properties are usually bound to child visuals which will invalidate
            UIReaction<minerva.Thickness>(Control.PaddingProperty, (upd, nv, ov) => upd.invalidateMeasure(), false, true, this);
            UIReaction<minerva.Thickness>(Control.BorderThicknessProperty, (upd, nv, ov) => upd.invalidateMeasure(), false, true, this);
            UIReaction<HorizontalAlignment>(Control.HorizontalContentAlignmentProperty, (upd, nv, ov) => upd.invalidateArrange(), false, true, this);
            UIReaction<VerticalAlignment>(Control.VerticalContentAlignmentProperty, (upd, nv, ov) => upd.invalidateArrange(), false, true, this);
        }

        static BackgroundProperty = DependencyProperty.RegisterCore("Background", () => Media.Brush, Control);
        static BorderBrushProperty = DependencyProperty.RegisterCore("BorderBrush", () => Media.Brush, Control);
        static BorderThicknessProperty = DependencyProperty.RegisterCore("BorderThickness", () => Thickness, Control);
        static FontFamilyProperty = InheritableOwner.FontFamilyProperty.ExtendTo(Control);
        static FontSizeProperty = InheritableOwner.FontSizeProperty.ExtendTo(Control);
        static FontStretchProperty = InheritableOwner.FontStretchProperty.ExtendTo(Control);
        static FontStyleProperty = InheritableOwner.FontStyleProperty.ExtendTo(Control);
        static FontWeightProperty = InheritableOwner.FontWeightProperty.ExtendTo(Control);
        static ForegroundProperty = InheritableOwner.ForegroundProperty.ExtendTo(Control);
        static HorizontalContentAlignmentProperty: DependencyProperty = DependencyProperty.Register("HorizontalContentAlignment", () => new Enum(HorizontalAlignment), Control, HorizontalAlignment.Center);
        static IsEnabledProperty = DependencyProperty.Register("IsEnabled", () => Boolean, Control, true);
        static IsTabStopProperty = DependencyProperty.Register("IsTabStop", () => Boolean, Control, true);
        static PaddingProperty = DependencyProperty.RegisterCore("Padding", () => Thickness, Control);
        static TabIndexProperty = DependencyProperty.Register("TabIndex", () => Number, Control);
        static TabNavigationProperty = DependencyProperty.Register("TabNavigation", () => new Enum(Input.KeyboardNavigationMode), Control, Input.KeyboardNavigationMode.Local);
        static TemplateProperty = DependencyProperty.Register("Template", () => ControlTemplate, Control, undefined, (d, args) => (<Control>d).XamlNode.OnTemplateChanged(args.OldValue, args.NewValue));
        static VerticalContentAlignmentProperty = DependencyProperty.Register("VerticalContentAlignment", () => new Enum(VerticalAlignment), Control, VerticalAlignment.Center);

        IsInheritable(propd: DependencyProperty): boolean {
            if (ControlInheritedProperties.indexOf(propd) > -1)
                return true;
            return super.IsInheritable(propd);
        }

        Background: Media.Brush;
        BorderBrush: Media.Brush;
        BorderThickness: Thickness;
        FontFamily: string;
        FontSize: number;
        FontStretch: string;
        FontStyle: string;
        FontWeight: FontWeight;
        Foreground: Media.Brush;
        HorizontalContentAlignment: HorizontalAlignment;
        IsEnabled: boolean;
        IsTabStop: boolean;
        Padding: Thickness;
        TabIndex: number;
        TabNavigation: Input.KeyboardNavigationMode;
        Template: ControlTemplate;
        VerticalContentAlignment: VerticalAlignment;

        get IsFocused() { return this.XamlNode.IsFocused; }

        GetTemplateChild(childName: string, type?: Function): DependencyObject {
            var root = this.XamlNode.TemplateRoot;
            if (!root)
                return;
            var n = root.XamlNode.FindName(childName);
            if (!n)
                return;
            var xobj = n.XObject;
            if (!type || (xobj instanceof type))
                return <DependencyObject>xobj;
        }

        ApplyTemplate(): boolean {
            var error = new BError();
            var result = this.XamlNode.ApplyTemplateWithError(error);
            if (error.Message)
                error.ThrowException();
            return result;
        }

        GetDefaultStyle(): Style {
            return undefined;
        }

        IsEnabledChanged = new nullstone.Event<DependencyPropertyChangedEventArgs>();
        OnIsEnabledChanged(e: IDependencyPropertyChangedEventArgs) { }

        OnGotFocus(e: RoutedEventArgs) {
            this.XamlNode.IsFocused = true;
            this.UpdateValidationState();
        }
        OnLostFocus(e: RoutedEventArgs) {
            this.XamlNode.IsFocused = false;
            this.UpdateValidationState();
        }

        UpdateVisualState(useTransitions?: boolean) {
            useTransitions = useTransitions !== false;
            var gotoFunc = (state: string) => Media.VSM.VisualStateManager.GoToState(this, state, useTransitions);
            this.GoToStates(gotoFunc);
        }
        GoToStates(gotoFunc: (state: string) => boolean) {
            this.GoToStateCommon(gotoFunc);
            this.GoToStateFocus(gotoFunc);
            this.GoToStateSelection(gotoFunc);
        }
        GoToStateCommon(gotoFunc: (state: string) => boolean): boolean {
            if (!this.IsEnabled)
                return gotoFunc("Disabled");
            if (this.IsMouseOver)
                return gotoFunc("MouseOver");
            return gotoFunc("Normal");
        }
        GoToStateFocus(gotoFunc: (state: string) => boolean): boolean {
            if (this.IsFocused && this.IsEnabled)
                return gotoFunc("Focused");
            return gotoFunc("Unfocused");
        }
        GoToStateSelection(gotoFunc: (state: string) => boolean): boolean {
            return false;
        }

        UpdateValidationState (valid?: boolean) {
            if (valid === undefined) {
                var errors = Validation.GetErrors(this);
                valid = errors.Count < 1;
            }
            var gotoFunc = (state: string) => Media.VSM.VisualStateManager.GoToState(this, state, true);
            this.GoToStateValidation(valid, gotoFunc);
        }

        GoToStateValidation (valid: boolean, gotoFunc: (state: string) => boolean) {
            if (valid)
                return gotoFunc("Valid");
            else if (this.IsFocused)
                return gotoFunc("InvalidFocused");
            return gotoFunc("InvalidUnfocused");
        }
    }
    Fayde.CoreLibrary.add(Control);

    Control.IsEnabledProperty.Store = Providers.IsEnabledStore.Instance;

    var ControlInheritedProperties = [
        Control.FontFamilyProperty,
        Control.FontSizeProperty,
        Control.FontStretchProperty,
        Control.FontStyleProperty,
        Control.FontWeightProperty,
        Control.ForegroundProperty
    ];

    export interface ITemplateVisualStateDefinition {
        Name: string;
        GroupName: string;
    }
    export var TemplateVisualStates = nullstone.CreateTypedAnnotation<ITemplateVisualStateDefinition>("TemplateVisualState");

    export interface ITemplatePartDefinition {
        Name: string;
        Type: Function;
    }
    export var TemplateParts = nullstone.CreateTypedAnnotation<ITemplatePartDefinition>("TemplatePart");
}