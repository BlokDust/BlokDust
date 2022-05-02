module Fayde.Data {
    export class RelativeSource implements nullstone.markup.IMarkupExtension, ICloneable {
        Mode: RelativeSourceMode;
        AncestorLevel: number;
        AncestorType: Function = null;

        constructor ();
        constructor (rs: RelativeSource);
        constructor (obj?: any) {
            if (obj instanceof RelativeSource) {
                var rs = <RelativeSource>obj;
                this.Mode = rs.Mode;
                this.AncestorLevel = rs.AncestorLevel;
                this.AncestorType = rs.AncestorType;
            }
        }

        init (val: string) {
            this.Mode = RelativeSourceMode[val];
        }

        resolveTypeFields (resolver: (full: string) => any) {
            if (typeof this.AncestorType === "string")
                this.AncestorType = resolver(<any>this.AncestorType);
        }

        transmute (os: any[]): any {
            if (this.Mode == null && typeof this.AncestorType === "function") {
                this.Mode = RelativeSourceMode.FindAncestor;
            } else {
                this.Mode = Enum.fromAny(RelativeSourceMode, this.Mode);
            }
            this.AncestorLevel = parseInt(<any>this.AncestorLevel) || 1;
            Object.freeze(this);
            return this;
        }

        Clone () {
            return new RelativeSource(this);
        }

        Find (target: XamlObject) {
            switch (this.Mode) {
                case RelativeSourceMode.Self:
                    return target;
                case RelativeSourceMode.TemplatedParent:
                    return target.TemplateOwner;
                case RelativeSourceMode.FindAncestor:
                    return findAncestor(target, this);
                case RelativeSourceMode.ItemsControlParent:
                    return findItemsControlAncestor(target, this);
            }
        }
    }
    Fayde.CoreLibrary.add(RelativeSource);

    function findAncestor (target: XamlObject, relSource: Data.RelativeSource): XamlObject {
        if (!(target instanceof DependencyObject))
            return;
        var ancestorType = relSource.AncestorType;
        if (typeof ancestorType !== "function") {
            console.warn("RelativeSourceMode.FindAncestor with no AncestorType specified.");
            return;
        }
        var ancestorLevel = relSource.AncestorLevel;
        if (isNaN(ancestorLevel)) {
            console.warn("RelativeSourceMode.FindAncestor with no AncestorLevel specified.");
            return;
        }
        for (var parent = VisualTreeHelper.GetParent(<DependencyObject>target); parent != null; parent = VisualTreeHelper.GetParent(parent)) {
            if (parent instanceof ancestorType && --ancestorLevel < 1)
                return parent;
        }
    }

    function findItemsControlAncestor (target: XamlObject, relSource: Data.RelativeSource): XamlObject {
        if (!(target instanceof DependencyObject))
            return;
        var ancestorLevel = relSource.AncestorLevel;
        ancestorLevel = ancestorLevel || 1; //NOTE: Will coerce 0 to 1 also
        for (var parent = VisualTreeHelper.GetParent(<DependencyObject>target); parent != null; parent = VisualTreeHelper.GetParent(parent)) {
            if (!!(<UIElement>parent).IsItemsControl && --ancestorLevel < 1)
                return parent;
        }
    }
}