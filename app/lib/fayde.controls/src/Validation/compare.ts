module Fayde.Controls {
    export function compareSummaryItems (item1: ValidationSummaryItem, item2: ValidationSummaryItem): number {
        var refs = compareRefs(item1, item2);
        if (refs != null)
            return refs;
        var comp = compareNum(item1.ItemType, item2.ItemType);
        if (comp !== 0)
            return comp;

        var control1: Control = item1.Sources.Count > 0 ? item1.Sources.GetValueAt(0).Control : null;
        var control2: Control = item2.Sources.Count > 0 ? item2.Sources.GetValueAt(0).Control : null;
        if (control1 !== control2) {
            refs = compareRefs(control1, control2);
            if (refs != null)
                return refs;
            comp = compareNum(control1.TabIndex, control2.TabIndex);
            if (comp !== 0)
                return comp;
            return compareVisualOrder(control1, control2);
        }
    }

    function compareRefs (item1: any, item2: any): number {
        if (item1 == null)
            return item2 == null ? null : -1;
        if (item2 == null)
            return 1;
        return null;
    }

    function compareNum (x: number, y: number): number {
        return x === y ? 0 : (x < y ? -1 : 1);
    }

    function compareVisualOrder (control1: Control, control2: Control): number {
        if (!control1 || !control2 || control1 === control2)
            return 0;
        var trail: DependencyObject[] = [];
        var cur = <DependencyObject>control1;
        trail.push(cur);
        while ((cur = VisualTreeHelper.GetParent(cur)) != null) {
            trail.push(cur);
        }

        cur = control2;
        var last = cur;
        while ((cur = VisualTreeHelper.GetParent(cur)) != null) {
            var index = trail.indexOf(cur);
            if (index === 0)
                return -1;
            if (index < 0)
                continue;
            var prev = trail[index - 1];
            if (!last || !prev)
                return 0;
            for (var i = 0, count = VisualTreeHelper.GetChildrenCount(cur); i < count; i++) {
                var child = VisualTreeHelper.GetChild(cur, i);
                if (child === prev)
                    return 1;
                if (child === last)
                    return -1;
            }
            last = cur;
        }
        return 0;
    }
}