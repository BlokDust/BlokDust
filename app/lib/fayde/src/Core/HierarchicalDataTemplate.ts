/// <reference path="DataTemplate.ts" />

module Fayde {
    export class HierarchicalDataTemplate extends DataTemplate {
        static ItemsSourceProperty = DependencyProperty.Register("ItemsSource", () => nullstone.IEnumerable_, HierarchicalDataTemplate);
        static ItemTemplateProperty = DependencyProperty.Register("ItemTemplate", () => DataTemplate, HierarchicalDataTemplate);
        static ItemContainerStyleProperty = DependencyProperty.Register("ItemContainerStyle", () => Style, HierarchicalDataTemplate);
        ItemsSource: nullstone.IEnumerable<any>;
        ItemTemplate: DataTemplate;
        ItemContainerStyle: Style;
    }
    Fayde.CoreLibrary.add(HierarchicalDataTemplate);
}