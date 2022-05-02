module Fayde.Controls.tabpanel {
    import Size = minerva.Size;
    import Visibility = minerva.Visibility;
    import PanelUpdaterTree = minerva.controls.panel.PanelUpdaterTree;

    export module helpers {
        export function getDesiredSizeWithoutMargin (upd: minerva.core.Updater): Size {
            var timargin = getTabItemMargin(upd);

            var size = new Size();
            Size.copyTo(upd.assets.desiredSize, size);
            var margin = upd.assets.margin;
            size.height = Math.max(0.0, size.height - margin.top - margin.bottom);
            size.width = Math.max(0.0, size.width - margin.left - margin.right + timargin);
            return size;
        }

        function getTabItemMargin (upd: minerva.core.Updater): number {
            var node = upd.getAttachedValue("$node");
            var ti: TabItem = node ? node.XObject : null;
            if (!(ti instanceof TabItem) || ti.IsSelected)
                return 0;

            var panel = <Panel>ti.GetTemplate(ti.IsSelected, ti.TabStripPlacement);
            if (!(panel instanceof Panel) || panel.Children.Count <= 0)
                return 0;

            var fe = <FrameworkElement>panel.Children.GetValueAt(0);
            if (!(fe instanceof FrameworkElement) || !fe.Margin)
                return 0;

            return Math.abs(fe.Margin.left + fe.Margin.right);
        }

        export function getHeadersSize (tree: PanelUpdaterTree): number[] {
            var arr = [];
            for (var walker = tree.walk(); walker.step();) {
                var child = walker.current;
                var width = child.assets.visibility === Visibility.Collapsed ? 0.0 : getDesiredSizeWithoutMargin(child).width
                arr.push(width);
            }
            return arr;
        }

        export function setTabItemZ (upd: minerva.core.Updater) {
            var node = upd.getAttachedValue("$node");
            var ti: TabItem = node ? node.XObject : null;
            if (!(ti instanceof TabItem))
                return;
            var zi = ti.IsSelected ? 1 : 0;
            ti.SetCurrentValue(Canvas.ZIndexProperty, zi);
        }

        function getTabItemIsSelected (upd: minerva.core.Updater): boolean {
            var node = upd.getAttachedValue("$node");
            var ti: TabItem = node ? node.XObject : null;
            if (!(ti instanceof TabItem))
                return;
            return ti.IsSelected === true;
        }

        export function getActiveRow (tree: PanelUpdaterTree, solution: number[], isDockTop: boolean): number {
            var index = 0;
            var num = 0;
            if (solution.length > 0) {
                for (var walker = tree.walk(); walker.step();) {
                    var child = walker.current;
                    if (getTabItemIsSelected(child))
                        return index;
                    if (index < solution.length && solution[index] === num)
                        ++index;
                    ++num;
                }
            }
            if (isDockTop)
                index = this._NumberOfRows - 1;
            return index;
        }

        export function calculateHeaderDistribution (tree: PanelUpdaterTree, rowWidthLimit: number, headerWidth: number[]): number[] {
            var num1 = 0.0;
            var length1 = headerWidth.length;
            var length2 = this._NumberOfRows - 1;
            var num2 = 0.0;
            var num3 = 0;
            var numArray1 = new Array(length2);
            var numArray2 = new Array(length2);

            var numArray3 = new Array(this._NumberOfRows);
            var numArray4 = numArray3.slice(0);
            var numArray5 = numArray3.slice(0);
            var numArray6 = numArray3.slice(0);

            var index1 = 0;
            for (var index2 = 0; index2 < length1; ++index2) {
                if (num2 + headerWidth[index2] > rowWidthLimit && num3 > 0) {
                    numArray4[index1] = num2;
                    numArray3[index1] = num3;
                    var num4 = Math.max(0.0, (rowWidthLimit - num2) / num3);
                    numArray5[index1] = num4;
                    numArray1[index1] = index2 - 1;
                    if (num1 < num4)
                        num1 = num4;
                    ++index1;
                    num2 = headerWidth[index2];
                    num3 = 1;
                }
                else {
                    num2 += headerWidth[index2];
                    if (headerWidth[index2] != 0.0)
                        ++num3;
                }
            }
            if (index1 === 0)
                return [];
            numArray4[index1] = num2;
            numArray3[index1] = num3;
            var num5 = (rowWidthLimit - num2) / num3;
            numArray5[index1] = num5;
            if (num1 < num5)
                num1 = num5;

            numArray2 = numArray1.slice(0);
            numArray6 = numArray5.slice(0);
            while (true) {
                var num4 = 0;
                do {
                    var num6 = 0;
                    var num7 = 0.0;
                    for (var index2 = 0; index2 < this._NumberOfRows; ++index2) {
                        if (num7 < numArray5[index2]) {
                            num7 = numArray5[index2];
                            num6 = index2;
                        }
                    }
                    if (num6 != 0) {
                        var index2 = num6;
                        var index3 = index2 - 1;
                        var index4 = numArray1[index3];
                        var num8 = headerWidth[index4];
                        numArray4[index2] += num8;
                        if (numArray4[index2] <= rowWidthLimit) {
                            --numArray1[index3];
                            ++numArray3[index2];
                            numArray4[index3] -= num8;
                            --numArray3[index3];
                            numArray5[index3] = (rowWidthLimit - numArray4[index3]) / numArray3[index3];
                            numArray5[index2] = (rowWidthLimit - numArray4[index2]) / numArray3[index2];
                            num4 = 0.0;
                            for (var index5 = 0; index5 < this._NumberOfRows; ++index5) {
                                if (num4 < numArray5[index5])
                                    num4 = numArray5[index5];
                            }
                        }
                        else
                            break;
                    }
                    else
                        break;
                }
                while (num4 >= num1);
                num1 = num4;
                numArray2 = numArray1.slice(0);
                numArray6 = numArray5.slice(0);
            }

            var index6 = 0;
            var index7 = 0;
            for (var walker = tree.walk(); walker.step();) {
                var child = walker.current;
                if (child.assets.visibility === Visibility.Visible)
                    headerWidth[index7] += numArray6[index6];
                if (index6 < length2 && numArray2[index6] == index7)
                    ++index6;
                ++index7;
            }
            return numArray2;
        }
    }
}