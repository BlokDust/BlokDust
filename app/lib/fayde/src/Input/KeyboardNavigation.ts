/// <reference path="../Core/DependencyObject.ts" />

module Fayde.Input {
    export class KeyboardNavigation {
        static AcceptsReturnProperty: DependencyProperty = DependencyProperty.RegisterAttached("AcceptsReturn", () => Boolean, KeyboardNavigation);
        static GetAcceptsReturn(d: DependencyObject): boolean { return d.GetValue(KeyboardNavigation.AcceptsReturnProperty); }
        static SetAcceptsReturn(d: DependencyObject, value: boolean) { d.SetValue(KeyboardNavigation.AcceptsReturnProperty, value); }

        static ControlTabNavigationProperty: DependencyProperty = DependencyProperty.RegisterAttached("ControlTabNavigation", () => new Enum(KeyboardNavigationMode), KeyboardNavigation);
        static GetControlTabNavigation(d: DependencyObject): KeyboardNavigationMode { return d.GetValue(KeyboardNavigation.ControlTabNavigationProperty); }
        static SetControlTabNavigation(d: DependencyObject, value: KeyboardNavigationMode) { d.SetValue(KeyboardNavigation.ControlTabNavigationProperty, value); }

        static DirectionalNavigationProperty: DependencyProperty = DependencyProperty.RegisterAttached("DirectionalNavigation", () => new Enum(KeyboardNavigationMode), KeyboardNavigation);
        static GetDirectionalNavigation(d: DependencyObject): KeyboardNavigationMode { return d.GetValue(KeyboardNavigation.DirectionalNavigationProperty); }
        static SetDirectionalNavigation(d: DependencyObject, value: KeyboardNavigationMode) { d.SetValue(KeyboardNavigation.DirectionalNavigationProperty, value); }

        static IsTabStopProperty: DependencyProperty = DependencyProperty.RegisterAttached("IsTabStop", () => Boolean, KeyboardNavigation);
        static GetIsTabStop(d: DependencyObject): boolean { return d.GetValue(KeyboardNavigation.IsTabStopProperty); }
        static SetIsTabStop(d: DependencyObject, value: boolean) { d.SetValue(KeyboardNavigation.IsTabStopProperty, value); }

        static TabIndexProperty: DependencyProperty = DependencyProperty.RegisterAttached("TabIndex", () => Number, KeyboardNavigation);
        static GetTabIndex(d: DependencyObject): number { return d.GetValue(KeyboardNavigation.TabIndexProperty); }
        static SetTabIndex(d: DependencyObject, value: number) { d.SetValue(KeyboardNavigation.TabIndexProperty, value); }

        static TabNavigationProperty: DependencyProperty = DependencyProperty.RegisterAttached("TabNavigation", () => new Enum(KeyboardNavigationMode), KeyboardNavigation);
        static GetTabNavigation(d: DependencyObject): KeyboardNavigationMode { return d.GetValue(KeyboardNavigation.TabNavigationProperty); }
        static SetTabNavigation(d: DependencyObject, value: KeyboardNavigationMode) { d.SetValue(KeyboardNavigation.TabNavigationProperty, value); }
    }
    Fayde.CoreLibrary.add(KeyboardNavigation);
}