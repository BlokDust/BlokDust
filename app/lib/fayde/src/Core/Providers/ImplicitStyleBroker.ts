module Fayde.Providers {
    export enum StyleIndex {
        VisualTree = 0,
        ApplicationResources = 1,
        Theme = 2,
        Count = 3,
    }
    export enum StyleMask {
        None = 0,
        VisualTree = 1 << StyleIndex.VisualTree,
        ApplicationResources = 1 << StyleIndex.ApplicationResources,
        Theme = 1 << StyleIndex.Theme,
        All = StyleMask.VisualTree | StyleMask.ApplicationResources | StyleMask.Theme,
    }

    export interface IImplicitStyleHolder {
        _ImplicitStyles: Style[];
        _StyleMask: number;
    }

    export class ImplicitStyleBroker {
        static Set (fe: FrameworkElement, mask: StyleMask, styles?: Style[]) {
            if (!styles)
                styles = getImplicitStyles(fe, mask);
            if (styles) {
                var error = new BError();
                var len = StyleIndex.Count;
                for (var i = 0; i < len; i++) {
                    var style = styles[i];
                    if (!style)
                        continue;
                    if (!style.Validate(fe, error)) {
                        error.ThrowException();
                        //Warn("Style validation failed. [" + error.Message + "]");
                        return;
                    }
                }
            }
            ImplicitStyleBroker.SetImpl(fe, mask, styles);
        }

        private static SetImpl (fe: FrameworkElement, mask: StyleMask, styles: Style[]) {
            if (!styles)
                return;

            var oldStyles = (<IImplicitStyleHolder>fe.XamlNode)._ImplicitStyles;
            var newStyles: Style[] = [null, null, null];
            if (oldStyles) {
                newStyles[StyleIndex.Theme] = oldStyles[StyleIndex.Theme];
                newStyles[StyleIndex.ApplicationResources] = oldStyles[StyleIndex.ApplicationResources];
                newStyles[StyleIndex.VisualTree] = oldStyles[StyleIndex.VisualTree];
            }
            if (mask & StyleMask.Theme)
                newStyles[StyleIndex.Theme] = styles[StyleIndex.Theme];
            if (mask & StyleMask.ApplicationResources)
                newStyles[StyleIndex.ApplicationResources] = styles[StyleIndex.ApplicationResources];
            if (mask & StyleMask.VisualTree)
                newStyles[StyleIndex.VisualTree] = styles[StyleIndex.VisualTree];

            ImplicitStyleBroker.ApplyStyles(fe, mask, styles);
        }

        static Clear (fe: FrameworkElement, mask: StyleMask) {
            var holder = <IImplicitStyleHolder>fe.XamlNode;
            var oldStyles = holder._ImplicitStyles;
            if (!oldStyles)
                return;

            var newStyles = oldStyles.slice(0);
            //TODO: Do we need a deep copy?
            if (mask & StyleMask.Theme)
                newStyles[StyleIndex.Theme] = null;
            if (mask & StyleMask.ApplicationResources)
                newStyles[StyleIndex.ApplicationResources] = null;
            if (mask & StyleMask.VisualTree)
                newStyles[StyleIndex.VisualTree] = null;

            ImplicitStyleBroker.ApplyStyles(fe, holder._StyleMask & ~mask, newStyles);
        }

        private static ApplyStyles (fe: FrameworkElement, mask: StyleMask, styles: Style[]) {
            var holder = <IImplicitStyleHolder>fe.XamlNode;

            var oldStyles = holder._ImplicitStyles;
            var isChanged = !oldStyles || mask !== holder._StyleMask;
            if (!isChanged) {
                for (var i = 0; i < StyleIndex.Count; i++) {
                    if (styles[i] !== oldStyles[i]) {
                        isChanged = true;
                        break;
                    }
                }
            }
            if (!isChanged)
                return;

            SwapStyles(fe, MultipleStylesWalker(oldStyles), MultipleStylesWalker(styles), true);

            holder._ImplicitStyles = styles;
            holder._StyleMask = mask;
        }
    }

    function getImplicitStyles (fe: FrameworkElement, mask: StyleMask): Style[] {
        var styles = [];
        if ((mask & StyleMask.Theme) != 0) {
            styles[StyleIndex.Theme] = getThemeStyle(fe);
        }

        if ((mask & StyleMask.ApplicationResources) != 0) {
            var app = Application.Current;
            if (app)
                styles[StyleIndex.ApplicationResources] = getAppResourcesStyle(app, fe);
        }

        if ((mask & StyleMask.VisualTree) != 0)
            styles[StyleIndex.VisualTree] = getVisualTreeStyle(fe);

        return styles;
    }

    function getThemeStyle (fe: FrameworkElement): Style {
        if (fe instanceof Controls.Control) {
            var style = (<Controls.Control>fe).GetDefaultStyle();
            if (style)
                return style;
        }
        return ThemeManager.FindStyle(fe.DefaultStyleKey);
    }

    function getAppResourcesStyle (app: Application, fe: FrameworkElement): Style {
        return <Style>app.Resources.Get(fe.DefaultStyleKey);
    }

    function getVisualTreeStyle (fe: FrameworkElement): Style {
        var key = fe.DefaultStyleKey;
        var cur = fe;
        var isControl = cur instanceof Controls.Control;
        var curNode = fe.XamlNode;
        var rd: ResourceDictionary;

        while (curNode) {
            cur = curNode.XObject;
            if (cur.TemplateOwner && !fe.TemplateOwner) {
                cur = <FrameworkElement>cur.TemplateOwner;
                curNode = cur.XamlNode;
                continue;
            }
            if (!isControl && cur === fe.TemplateOwner)
                break;

            rd = cur.Resources;
            if (rd) {
                var style = <Style>rd.Get(key);
                if (style)
                    return style;
            }

            curNode = <FENode>curNode.VisualParentNode;
        }

        return undefined;
    }
}