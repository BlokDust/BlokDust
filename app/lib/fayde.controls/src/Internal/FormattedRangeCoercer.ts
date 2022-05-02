module Fayde.Controls.Internal {
    export interface IFormattedRange extends IRange {
        DecimalPlaces: number;
        OnDecimalPlacesChanged(oldDecPlaces: number, newDecPlaces: number);
    }
    export interface IFormattedRangeCoercer extends IRangeCoercer {
        OnDecimalPlacesChanged(oldDecPlaces: number, newDecPlaces: number);
        AddToValue(inc: number);
    }
    export class FormattedRangeCoercer extends RangeCoercer implements IFormattedRangeCoercer {
        constructor(range: IFormattedRange, onCoerceMaximum: (val: any) => void, onCoerceValue: (val: any) => void, public OnCoerceFormat: () => void) {
            super(range, onCoerceMaximum, onCoerceValue);
        }

        OnDecimalPlacesChanged(oldDecPlaces: number, newDecPlaces: number) {
            this.CoerceDepth++;
            this.OnCoerceFormat();
            this.CoerceDepth--;
        }

        AddToValue(inc: number) {
            this.OnCoerceValue(this.Value + inc);
            this.RequestedVal = this.Value;
        }
    }
} 