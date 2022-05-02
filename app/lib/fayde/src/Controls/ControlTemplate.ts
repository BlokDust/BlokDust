/// <reference path="../Markup/Loader" />

module Fayde.Controls {
    export class ControlTemplate extends Markup.FrameworkTemplate {
        static TargetTypeProperty = DependencyProperty.Register("TargetType", () => IType_, ControlTemplate);
        TargetType: Function;

        Validate(): string {
            if (!this.TargetType)
                return "ControlTemplate must have a TargetType.";
        }
    }
    Fayde.CoreLibrary.add(ControlTemplate);
}