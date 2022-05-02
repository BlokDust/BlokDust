module Fayde.Controls {
    export class TabPanel extends Panel {
        CreateLayoutUpdater () {
            return new tabpanel.TabPanelUpdater();
        }

        //TODO: Alter TabNavigation, DirectionalNavigation

        private get TabAlignment (): Dock {
            var tabControlParent: TabControl = VisualTreeHelper.GetParentOfType<TabControl>(this, TabControl);
            if (tabControlParent != null)
                return tabControlParent.TabStripPlacement;
            return Dock.Top;
        }

        static setTabAlignment (tp: TabPanel, alignment: Dock) {
            if (!tp)
                return;
            var upd = <tabpanel.TabPanelUpdater>tp.XamlNode.LayoutUpdater;
            upd.assets.tabAlignment = alignment;
        }
    }
}