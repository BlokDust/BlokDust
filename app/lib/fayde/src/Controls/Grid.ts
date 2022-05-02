/// <reference path="Panel.ts" />

module Fayde.Controls {
    export class GridNode extends PanelNode {
        LayoutUpdater: minerva.controls.grid.GridUpdater;

        ColumnDefinitionsChanged (coldef: ColumnDefinition, index: number, add: boolean) {
            var updater = this.LayoutUpdater;
            var coldefs = updater.assets.columnDefinitions;

            if (add) {
                coldefs.splice(index, 0, coldef);
                ReactTo(coldef, this, () => updater.invalidateMeasure());
            } else {
                UnreactTo(coldef, this);
                coldefs.splice(index, 1);
            }

            updater.invalidateMeasure();
        }

        RowDefinitionsChanged (rowdef: RowDefinition, index: number, add: boolean) {
            var updater = this.LayoutUpdater;
            var rowdefs = updater.assets.rowDefinitions;

            if (add) {
                rowdefs.splice(index, 0, rowdef);
                ReactTo(rowdef, this, () => updater.invalidateMeasure());
            } else {
                UnreactTo(rowdef, this);
                rowdefs.splice(index, 1);
            }

            updater.invalidateMeasure();
        }
    }

    export class Grid extends Panel {
        XamlNode: GridNode;
        CreateNode(): GridNode { return new GridNode(this); }
        CreateLayoutUpdater () { return new minerva.controls.grid.GridUpdater(); }

        static ColumnProperty = DependencyProperty.RegisterAttached("Column", () => Number, Grid, 0);
        static GetColumn (d: DependencyObject): number { return d.GetValue(Grid.ColumnProperty); }
        static SetColumn (d: DependencyObject, value: number) { d.SetValue(Grid.ColumnProperty, value); }

        static ColumnSpanProperty = DependencyProperty.RegisterAttached("ColumnSpan", () => Number, Grid, 1);
        static GetColumnSpan (d: DependencyObject): number { return d.GetValue(Grid.ColumnSpanProperty); }
        static SetColumnSpan (d: DependencyObject, value: number) { d.SetValue(Grid.ColumnSpanProperty, value); }

        static RowProperty = DependencyProperty.RegisterAttached("Row", () => Number, Grid, 0);
        static GetRow (d: DependencyObject): number { return d.GetValue(Grid.RowProperty); }
        static SetRow (d: DependencyObject, value: number) { d.SetValue(Grid.RowProperty, value); }

        static RowSpanProperty = DependencyProperty.RegisterAttached("RowSpan", () => Number, Grid, 1);
        static GetRowSpan (d: DependencyObject): number { return d.GetValue(Grid.RowSpanProperty); }
        static SetRowSpan (d: DependencyObject, value: number) { d.SetValue(Grid.RowSpanProperty, value); }

        static ColumnDefinitionsProperty = DependencyProperty.RegisterImmutable<ColumnDefinitionCollection>("ColumnDefinitions", () => ColumnDefinitionCollection, Grid);
        static RowDefinitionsProperty = DependencyProperty.RegisterImmutable<RowDefinitionCollection>("RowDefinitions", () => RowDefinitionCollection, Grid);
        static ShowGridLinesProperty = DependencyProperty.Register("ShowGridLines", () => Boolean, Grid, false);
        ShowGridLines: boolean;
        ColumnDefinitions: ColumnDefinitionCollection;
        RowDefinitions: RowDefinitionCollection;

        constructor () {
            super();
            var coldefs = Grid.ColumnDefinitionsProperty.Initialize(this);
            ReactTo(coldefs, this, (obj?) => this.XamlNode.ColumnDefinitionsChanged(obj.item, obj.index, obj.add));
            var rowdefs = Grid.RowDefinitionsProperty.Initialize(this);
            ReactTo(rowdefs, this, (obj?) => this.XamlNode.RowDefinitionsChanged(obj.item, obj.index, obj.add));
        }
    }
    Fayde.CoreLibrary.add(Grid);

    module reactions {
        UIReaction<boolean>(Grid.ShowGridLinesProperty, minerva.controls.grid.reactTo.showGridLines, false);
        UIReactionAttached<number>(Grid.ColumnProperty, minerva.controls.grid.reactTo.column);
        UIReactionAttached<number>(Grid.ColumnSpanProperty, minerva.controls.grid.reactTo.columnSpan);
        UIReactionAttached<number>(Grid.RowProperty, minerva.controls.grid.reactTo.row);
        UIReactionAttached<number>(Grid.RowSpanProperty, minerva.controls.grid.reactTo.rowSpan);
    }
}