/// <reference path="ContentControl.ts" />

module Fayde.Controls {
    export class HeaderedContentControl extends ContentControl {
        static HeaderProperty = DependencyProperty.Register("Header", () => Object, HeaderedContentControl, undefined, (d, args) => (<HeaderedContentControl>d).OnHeaderChanged(args.OldValue, args.NewValue));
        Header: any;
        static HeaderTemplateProperty = DependencyProperty.Register("HeaderTemplate", () => DataTemplate, HeaderedContentControl, undefined, (d, args) => (<HeaderedContentControl>d).OnHeaderTemplateChanged(args.OldValue, args.NewValue));
        HeaderTemplate: DataTemplate;

        constructor() {
            super();
            this.DefaultStyleKey = HeaderedContentControl;
        }

        OnHeaderChanged(oldHeader: any, newHeader: any) { }
        OnHeaderTemplateChanged(oldHeaderTemplate: DataTemplate, newHeaderTemplate: DataTemplate) { }
    }
    Fayde.CoreLibrary.add(HeaderedContentControl);
}