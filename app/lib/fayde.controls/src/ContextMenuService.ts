
module Fayde.Controls {
    export class ContextMenuService {
        static ContextMenuProperty = DependencyProperty.RegisterAttached("ContextMenu", () => ContextMenu, ContextMenuService, undefined, ContextMenuService.OnContextMenuPropertyChanged);
        static GetContextMenu(d: DependencyObject): ContextMenu { return d.GetValue(ContextMenuService.ContextMenuProperty); }
        static SetContextMenu(d: DependencyObject, value: ContextMenu) { d.SetValue(ContextMenuService.ContextMenuProperty, value); }
        private static OnContextMenuPropertyChanged(d: DependencyObject, args: IDependencyPropertyChangedEventArgs) {
            var fe = <FrameworkElement>d;
            if (!(fe instanceof FrameworkElement))
                return;
            var oldMenu = <ContextMenu>args.OldValue;
            if (oldMenu instanceof ContextMenu)
                oldMenu.Owner = null;
            var newMenu = <ContextMenu>args.NewValue;
            if (newMenu instanceof ContextMenu)
                newMenu.Owner = fe;
        }
    }
}