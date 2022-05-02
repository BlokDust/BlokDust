module Fayde.Controls.Internal {
    var NO_GENERATOR: minerva.IVirtualizingGenerator = {
        current: undefined,
        generate: function (): boolean {
            return false;
        }
    };

    export class VirtualizingPanelContainerOwner implements minerva.IVirtualizingContainerOwner {
        constructor (private $$panel: VirtualizingPanel) {
        }

        get itemCount (): number {
            var panel = this.$$panel;
            var ic = panel ? panel.ItemsControl : null;
            return ic ? ic.Items.Count : 0;
        }

        createGenerator (index: number, count: number): minerva.IVirtualizingGenerator {
            var panel = this.$$panel;
            var ic = panel ? panel.ItemsControl : null;
            var icm = ic ? ic.ItemContainersManager : null;
            if (!icm)
                return NO_GENERATOR;
            var icgen = icm.CreateGenerator(index, count);
            var children = panel.Children;
            return {
                current: undefined,
                generate: function (): boolean {
                    this.current = undefined;
                    if (!icgen.Generate())
                        return false;
                    var child = icgen.Current;
                    if (icgen.IsCurrentNew) {
                        children.Insert(icgen.GenerateIndex, child);
                        ic.PrepareContainerForItem(child, icgen.CurrentItem);
                    }
                    this.current = child.XamlNode.LayoutUpdater;
                    return true;
                }
            };
        }

        remove (index: number, count: number) {
            var panel = this.$$panel;
            var ic = panel ? panel.ItemsControl : null;
            var icm = ic ? ic.ItemContainersManager : null;
            if (!icm)
                return;
            var old = icm.DisposeContainers(index, count);
            var children = panel.Children;
            for (var i = 0, len = old.length; i < len; i++) {
                children.Remove(old[i]);
            }
        }
    }
}