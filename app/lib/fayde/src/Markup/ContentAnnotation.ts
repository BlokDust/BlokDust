module Fayde.Markup {
    export interface IContentAnnotation {
        (type: Function, prop: DependencyProperty);
        Get(type: Function): DependencyProperty;
    }
    export var Content = <IContentAnnotation>(function () {
        function ca(type: Function, prop: DependencyProperty) {
            nullstone.Annotation(type, "Content", prop, true);
        }
        (<any>ca).Get = function (type: Function): DependencyProperty {
            var cur = type;
            while (cur) {
                var anns = nullstone.GetAnnotations(cur, "Content");
                if (anns) {
                    var cp = anns[0];
                    if (cp)
                        return cp;
                }
                cur = nullstone.getTypeParent(cur);
            }
            return undefined;
        };
        return ca;
    })();

    export interface ITextContentAnnotation {
        (type: Function, prop: DependencyProperty);
        Get(type: Function): DependencyProperty;
    }
    export var TextContent = <ITextContentAnnotation>(function () {
        function tca(type: Function, prop: DependencyProperty) {
            nullstone.Annotation(type, "TextContent", prop, true);
        }
        (<any>tca).Get = function (type: Function): DependencyProperty {
            var cur = type;
            while (cur) {
                var anns = nullstone.GetAnnotations(cur, "TextContent");
                if (anns) {
                    var cp = anns[0];
                    if (cp)
                        return cp;
                }
                cur = nullstone.getTypeParent(cur);
            }
            return undefined;
        };
        return tca;
    })();
}