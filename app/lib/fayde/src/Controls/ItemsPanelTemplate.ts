/// <reference path="../Markup/Loader" />

module Fayde.Controls {
    export class ItemsPanelTemplate extends Markup.FrameworkTemplate {
        GetVisualTree(bindingSource: DependencyObject): Panel {
            var panel = <Panel>super.GetVisualTree(bindingSource);
            if (!(panel instanceof Panel))
                throw new XamlParseException("The root element of an ItemsPanelTemplate must be a Panel subclass.");
            return panel;
        }
    }
    Fayde.CoreLibrary.add(ItemsPanelTemplate);
}