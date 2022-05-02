module Fayde.Controls.Internal {
    import GridUnitType = minerva.controls.grid.GridUnitType;

    export enum GridResizeDirection {
        Auto,
        Columns,
        Rows
    }
    export enum GridResizeBehavior {
        BasedOnAlignment,
        CurrentAndNext,
        PreviousAndCurrent,
        PreviousAndNext
    }
    export enum SplitBehavior {
        Split,
        ResizeDefinition1,
        ResizeDefinition2
    }

    export class GridSplitterResizer {
        Direction: GridResizeDirection;
        Behavior: GridResizeBehavior;
        SplitBehavior: SplitBehavior;
        SplitterIndex: number;
        SplitterLength: number;

        DS1: IDefinitionSize;
        DS2: IDefinitionSize;

        constructor (gs: GridSplitter) {
            this.UpdateResizeDirection(gs);
            this.Behavior = resizeBehaviors[this.Direction !== GridResizeDirection.Columns ? <number>gs.VerticalAlignment : gs.HorizontalAlignment]
            || GridResizeBehavior.PreviousAndNext;
            this.SplitterLength = Math.min(gs.ActualWidth, gs.ActualHeight);
        }

        Setup (gs: GridSplitter, grid: Grid): boolean {
            var isColumns = this.Direction === GridResizeDirection.Columns;
            var span = isColumns ? Grid.GetColumnSpan(gs) : Grid.GetRowSpan(gs);
            if (span > 1)
                return false;
            var index = isColumns ? Grid.GetColumn(gs) : Grid.GetRow(gs);
            var indices = this.GetBehaviorIndices(index);
            var defs = isColumns ? <XamlObjectCollection<any>>grid.ColumnDefinitions : grid.RowDefinitions;
            if (indices[0] < 0 || indices[1] >= defs.Count)
                return false;

            this.SplitterIndex = index;
            this.DS1 = createSize(defs.GetValueAt(indices[0]));
            this.DS1.Index = indices[0];
            this.DS2 = createSize(defs.GetValueAt(indices[1]));
            this.DS2.Index = indices[1];
            this.SplitBehavior = (this.DS1.IsStar && this.DS2.IsStar) ? SplitBehavior.Split : (!this.DS1.IsStar ? SplitBehavior.ResizeDefinition1 : SplitBehavior.ResizeDefinition2);

            return true;
        }

        Move (grid: Grid, horiz: number, vert: number): boolean {
            var ds1 = this.DS1;
            var ds2 = this.DS2;
            if (!ds1 || !ds2)
                return true;
            if (this.SplitBehavior === SplitBehavior.Split && !NumberEx.AreClose((ds1.ActualSize + ds2.ActualSize), (ds1.OrigActualSize + ds2.OrigActualSize)))
                return false;
            var deltaConstraints = this.GetConstraints();
            var num1 = deltaConstraints[0];
            var num2 = deltaConstraints[1];
            var num = this.Direction === GridResizeDirection.Columns ? horiz : vert;
            num = Math.min(Math.max(num, num1), num2);
            this.SetLengths(grid, ds1.ActualSize + num, ds2.ActualSize - num);
            return true;
        }

        UpdateResizeDirection (gs: GridSplitter): boolean {
            var old = this.Direction;
            if (gs.HorizontalAlignment !== HorizontalAlignment.Stretch)
                this.Direction = GridResizeDirection.Columns;
            else if (gs.VerticalAlignment === VerticalAlignment.Stretch && gs.ActualWidth <= gs.ActualHeight)
                this.Direction = GridResizeDirection.Columns;
            else
                this.Direction = GridResizeDirection.Rows;
            return old !== this.Direction;
        }

        private SetLengths (grid: Grid, definition1Pixels: number, definition2Pixels: number) {
            var columnDefinitions;
            if (this.SplitBehavior !== SplitBehavior.Split) {
                if (this.SplitBehavior === SplitBehavior.ResizeDefinition1)
                    this.DS1.Size = new GridLength(definition1Pixels, GridUnitType.Pixel);
                else
                    this.DS2.Size = new GridLength(definition2Pixels, GridUnitType.Pixel);
                return;
            }

            var enumerator: nullstone.IEnumerator<DependencyObject> = this.Direction === GridResizeDirection.Columns
                ? grid.ColumnDefinitions.getEnumerator() : grid.RowDefinitions.getEnumerator();
            var i = 0;
            while (enumerator.moveNext()) {
                var ds = createSize(enumerator.current);
                if (this.DS1.Index === i)
                    ds.Size = new GridLength(definition1Pixels, GridUnitType.Star);
                else if (this.DS2.Index === i)
                    ds.Size = new GridLength(definition2Pixels, GridUnitType.Star);
                else if (ds.IsStar)
                    ds.Size = new GridLength(ds.ActualSize, GridUnitType.Star);
                i++;
            }
        }

        private GetConstraints (): number[] {
            var actualLength = this.DS1.ActualSize;
            var minSize = this.DS1.MinSize;
            var maxSize = this.DS1.MaxSize;

            var actualLength1 = this.DS2.ActualSize;
            var minSize1 = this.DS2.MinSize;
            var maxSize1 = this.DS2.MaxSize;

            if (this.SplitterIndex === this.DS1.Index) {
                minSize = Math.max(minSize, this.SplitterLength);
            } else if (this.SplitterIndex === this.DS2.Index) {
                minSize1 = Math.max(minSize1, this.SplitterLength);
            }

            if (this.SplitBehavior === SplitBehavior.Split) {
                return [
                    -Math.min(actualLength - minSize, maxSize1 - actualLength1),
                    Math.min(maxSize - actualLength, actualLength1 - minSize1)
                ];
            }
            if (this.SplitBehavior !== SplitBehavior.ResizeDefinition1) {
                return [
                    actualLength1 - maxSize1,
                    actualLength1 - minSize1
                ];
            }
            return [
                minSize - actualLength,
                maxSize - actualLength
            ];
        }

        private GetBehaviorIndices (index: number): number[] {
            switch (this.Behavior) {
                case GridResizeBehavior.CurrentAndNext:
                    return [index, index + 1];
                case GridResizeBehavior.PreviousAndCurrent:
                    return [index - 1, index];
                default:
                    return [index - 1, index + 1];
            }
        }
    }

    var resizeBehaviors: GridResizeBehavior[] = [];
    resizeBehaviors[VerticalAlignment.Top] = GridResizeBehavior.PreviousAndCurrent;
    resizeBehaviors[VerticalAlignment.Bottom] = GridResizeBehavior.CurrentAndNext;
    resizeBehaviors[HorizontalAlignment.Left] = GridResizeBehavior.PreviousAndCurrent;
    resizeBehaviors[HorizontalAlignment.Right] = GridResizeBehavior.CurrentAndNext;


    import RowDefinition = Fayde.Controls.RowDefinition;
    import ColumnDefinition = Fayde.Controls.ColumnDefinition;
    export interface IDefinitionSize {
        ActualSize: number;
        MaxSize: number;
        MinSize: number;
        Size: GridLength;
        IsStar: boolean;
        Index: number;
        OrigActualSize: number;
    }
    function createSize (definition: Fayde.DependencyObject): IDefinitionSize {
        if (definition instanceof RowDefinition) {
            var rd = <RowDefinition>definition;
            var ds = {};
            Object.defineProperty(ds, "ActualSize", {
                get: function (): number {
                    return rd.ActualHeight;
                }
            });
            Object.defineProperty(ds, "MaxSize", {
                get: function (): number {
                    return rd.MaxHeight || 0;
                }
            });
            Object.defineProperty(ds, "MinSize", {
                get: function (): number {
                    return rd.MinHeight || 0;
                }
            });
            Object.defineProperty(ds, "Size", {
                get: function (): GridLength {
                    return rd.Height;
                },
                set: function (value: GridLength) {
                    rd.Height = value;
                }
            });
            Object.defineProperty(ds, "IsStar", {
                get: function (): boolean {
                    return !!rd.Height && rd.Height.Type === GridUnitType.Star;
                }
            });
            (<any>ds).Index = 0;
            (<any>ds).OrigActualSize = rd.ActualHeight;
            return <IDefinitionSize>ds;
        }
        if (definition instanceof ColumnDefinition) {
            var cd = <ColumnDefinition>definition;

            var ds = {};
            Object.defineProperty(ds, "ActualSize", {
                get: function (): number {
                    return cd.ActualWidth;
                }
            });
            Object.defineProperty(ds, "MaxSize", {
                get: function (): number {
                    return cd.MaxWidth || 0;
                }
            });
            Object.defineProperty(ds, "MinSize", {
                get: function (): number {
                    return cd.MinWidth || 0;
                }
            });
            Object.defineProperty(ds, "Size", {
                get: function (): GridLength {
                    return cd.Width;
                },
                set: function (value: GridLength) {
                    cd.Width = value;
                }
            });
            Object.defineProperty(ds, "IsStar", {
                get: function (): boolean {
                    return !!cd.Width && cd.Width.Type === GridUnitType.Star;
                }
            });
            (<any>ds).Index = 0;
            (<any>ds).OrigActualSize = cd.ActualWidth;
            return <IDefinitionSize>ds;
        }
    }
} 