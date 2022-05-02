module Fayde {
    export class TemplateBinding implements nullstone.markup.IMarkupExtension {
        SourceProperty: string;

        init (val: string) {
            this.SourceProperty = val;
        }

        transmute (os: any[]): any {
            return new TemplateBindingExpression(this.SourceProperty);
        }
    }
    Fayde.CoreLibrary.add(TemplateBinding);
}