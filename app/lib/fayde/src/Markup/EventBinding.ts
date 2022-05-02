module Fayde.Markup {
    export interface IEventFilter {
        Filter(sender: any, e: nullstone.IEventArgs, parameter: any): boolean;
    }
    export var IEventFilter_ = new nullstone.Interface<IEventFilter>("IEventFilter");

    export class EventBinding implements nullstone.markup.IMarkupExtension {
        CommandPath: string = null;
        Command: Data.BindingExpressionBase = null;
        CommandParameter: Data.BindingExpressionBase = null;
        CommandBinding: Data.Binding = null;
        CommandParameterBinding: Data.Binding = null;
        Filter: IEventFilter = null;

        init (val: string) {
            this.CommandPath = val;
        }

        transmute (os: any[]): any {
            this.$$coerce();
            Object.freeze(this);
            return new EventBindingExpression(this);
        }

        private $$coerce () {
            if (this.Command) {
                this.CommandBinding = this.Command.ParentBinding.Clone();
                this.Command = null;
            }
            if (this.CommandPath) {
                this.CommandBinding = new Data.Binding(this.CommandPath);
            }
            if (this.CommandParameter) {
                this.CommandParameterBinding = this.CommandParameter.ParentBinding.Clone();
                this.CommandParameter = null;
            }
        }
    }
    Fayde.CoreLibrary.add(EventBinding);
}