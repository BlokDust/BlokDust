module Fayde.Navigation {
    export function Navigate(source: DependencyObject, targetName: string, navigateUri: Uri) {
        if (!isExternalTarget(targetName)) {
            if (tryInternalNavigate(source, navigateUri, targetName))
                return;
            if (!isUriValidForExternalNav(navigateUri))
                throw new NotSupportedException("Navigation Failed");
        }
        var app = source.App;
        if (!app || !app.AllowNavigation)
            throw new InvalidOperationException("Navigation is now allowed.");
        var absoluteUri = getAbsoluteUri(navigateUri, app);
        if (!absoluteUri.isAbsoluteUri)
            throw new InvalidOperationException("Navigation Failed [" + absoluteUri.toString() + "]");
        launchDummyLink(targetName || "_self", absoluteUri.originalString);
    }

    function isExternalTarget(targetName: string): boolean {
        if (!targetName)
            return false;
        switch (targetName.toLowerCase()) {
            case "_blank":
            case "_media":
            case "_search":
            case "_parent":
            case "_self":
            case "_top":
                return true;
            default:
                return false;
        }
    }

    function tryInternalNavigate(source: DependencyObject, navigateUri: Uri, targetName: string): boolean {
        var lastSubtree = source;
        for (var en = walkUp(source); en.moveNext();) {
            var cur = <DependencyObject>en.current;
            if (cur && (INavigate_.is(cur) || !VisualTreeHelper.GetParent(cur))) {
                var navigator = findNavigator(cur, lastSubtree, targetName);
                if (navigator)
                    return navigator.Navigate(navigateUri);
                lastSubtree = cur;
            }
        }
        return false;
    }

    function findNavigator(root: DependencyObject, lastSubtree: DependencyObject, targetName: string): INavigate {
        if (!root || root === lastSubtree)
            return null;
        var nav = INavigate_.as(root);
        if (nav && (!targetName || targetName === root.Name))
            return nav;

        if (root instanceof Controls.Primitives.Popup) {
            return findNavigator((<Controls.Primitives.Popup>root).Child, lastSubtree, targetName);
        } else {
            for (var i = 0, len = VisualTreeHelper.GetChildrenCount(root); i < len; i++) {
                var navigator = findNavigator(VisualTreeHelper.GetChild(root, i), lastSubtree, targetName);
                if (navigator)
                    return navigator;
            }
        }
        return null;
    }

    function walkUp(xobj: XamlObject): nullstone.IEnumerator<XamlObject> {
        var e = {
            current: xobj,
            moveNext(): boolean {
                if (!e.current)
                    return false;
                e.current = (<any>e.current).VisualParent || e.current.Parent;
                return !!e.current;
            }
        };
        return e;
    }

    function isUriValidForExternalNav(navigateUri: Uri): boolean {
        if (!navigateUri.isAbsoluteUri) {
            if (!!navigateUri.originalString && navigateUri.originalString[0] !== "/")
                return false;
        }
        return true;
    }

    function getAbsoluteUri(navigateUri: Uri, app: Application) {
        var relativeUri = navigateUri;
        if (!relativeUri.isAbsoluteUri) {
            if (!!relativeUri.originalString && relativeUri.originalString[0] !== "/")
                throw new NotSupportedException("HyperlinkButton_GetAbsoluteUri_PageRelativeUri");
            if (!app)
                throw new NotSupportedException("HyperlinkButton_GetAbsoluteUri_NoApplication");
            relativeUri = new Uri(app.Address, relativeUri);
        }
        return relativeUri;
    }

    var dummyLink: HTMLAnchorElement;
    function launchDummyLink(target: string, navigateUri: string) {
        dummyLink = dummyLink || document.createElement('a');
        dummyLink.href = navigateUri;
        dummyLink.target = target;
        dummyLink.click();
    }
}