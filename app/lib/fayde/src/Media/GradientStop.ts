/// <reference path="../Core/DependencyObject.ts" />
/// <reference path="../Core/XamlObjectCollection.ts" />

module Fayde.Media {
    export interface IGradientStop {
        Color: Color;
        Offset: number;
    }

    export class GradientStop extends DependencyObject implements IGradientStop {
        static ColorProperty = DependencyProperty.Register("Color", () => Color, GradientStop, undefined, Incite);
        static OffsetProperty = DependencyProperty.Register("Offset", () => Number, GradientStop, 0.0, Incite);
        Color: Color;
        Offset: number;

        toString (): string {
            return this.Color.toString() + " @ " + this.Offset.toString();
        }
    }
    Fayde.CoreLibrary.add(GradientStop);

    export class GradientStopCollection extends XamlObjectCollection<GradientStop> {
        AddingToCollection (value: GradientStop, error: BError): boolean {
            if (!super.AddingToCollection(value, error))
                return false;
            ReactTo(value, this, () => Incite(this));
            Incite(this);
            return true;
        }

        RemovedFromCollection (value: GradientStop, isValueSafe: boolean) {
            if (!super.RemovedFromCollection(value, isValueSafe))
                return false;
            UnreactTo(value, this);
            Incite(this);
        }

        getPaddedEnumerable (): nullstone.IEnumerable<IGradientStop> {
            var minOffset = Number.MAX_VALUE;
            var min: GradientStop = null;
            var maxOffset = Number.MIN_VALUE;
            var max: GradientStop = null;
            for (var en = this.getEnumerator(); en.moveNext();) {
                if (en.current.Offset < minOffset) {
                    min = en.current;
                    minOffset = en.current.Offset;
                }
                if (en.current.Offset > maxOffset) {
                    max = en.current;
                    maxOffset = en.current.Offset;
                }
            }

            var arr: IGradientStop[] = this._ht.slice(0);
            if (!!min)
                arr.unshift({Offset: 0, Color: min.Color});
            if (!!max)
                arr.push({Offset: 1, Color: max.Color});

            return nullstone.IEnumerable_.fromArray(arr);
        }
    }
    Fayde.CoreLibrary.add(GradientStopCollection);
}