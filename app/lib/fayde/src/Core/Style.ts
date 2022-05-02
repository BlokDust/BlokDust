/// <reference path="DependencyObject.ts" />

module Fayde {
    export class Style extends DependencyObject {
        private _IsSealed: boolean = false;

        static SettersProperty = DependencyProperty.RegisterImmutable<SetterCollection>("Setters", () => SetterCollection, Style);
        static BasedOnProperty = DependencyProperty.Register("BasedOn", () => Style, Style);
        static TargetTypeProperty = DependencyProperty.Register("TargetType", () => IType_, Style);
        Setters: SetterCollection;
        BasedOn: Style;
        TargetType: Function;

        constructor () {
            super();
            var coll = Style.SettersProperty.Initialize(this);
            coll.AttachTo(this);
        }

        Seal () {
            if (this._IsSealed)
                return;
            this.Setters.Seal();
            this._IsSealed = true;

            var base = this.BasedOn;
            if (base)
                base.Seal();
        }

        Validate (instance: DependencyObject, error: BError): boolean {
            var targetType = this.TargetType;
            var parentType = <Function>(<any>instance).constructor;

            if (this._IsSealed) {
                if (!(instance instanceof targetType)) {
                    error.Number = BError.XamlParse;
                    error.Message = "Style.TargetType (" + (<any>targetType).name + ") is not a subclass of (" + (<any>parentType).name + ")";
                    return false;
                }
                return true;
            }

            // 1 Check for circular references in the BasedOn tree
            var cycles = [];
            var root = this;
            while (root) {
                if (cycles.indexOf(root) > -1) {
                    error.Number = BError.InvalidOperation;
                    error.Message = "Circular reference in Style.BasedOn";
                    return false;
                }
                cycles.push(root);
                root = root.BasedOn;
            }
            cycles = null;

            // 2 Check that the instance is a subclass of Style::TargetType and also all the styles TargetTypes are
            //   subclasses of their BasedOn styles TargetType.
            root = this;
            var targetType: Function;
            while (root) {
                targetType = root.TargetType;
                if (root === this) {
                    if (!targetType) {
                        error.Number = BError.InvalidOperation;
                        error.Message = "TargetType cannot be null";
                        return false;
                    } else if (!nullstone.doesInheritFrom(parentType, targetType)) {
                        error.Number = BError.XamlParse;
                        error.Message = "Style.TargetType (" + (<any>targetType).name + ") is not a subclass of (" + (<any>parentType).name + ")";
                        return false;
                    }
                } else if (!targetType || !nullstone.doesInheritFrom(parentType, targetType)) {
                    error.Number = BError.InvalidOperation;
                    error.Message = "Style.TargetType (" + (targetType ? (<any>targetType).name : "<Not Specified>") + ") is not a subclass of (" + (<any>parentType).name + ")";
                    return false;
                }
                parentType = targetType;
                root = root.BasedOn;
            }

            // 3 This style is now OK and never needs to be checked again.
            this.Seal();
            return true;
        }
    }
    Fayde.CoreLibrary.add(Style);
    Markup.Content(Style, Style.SettersProperty);
}