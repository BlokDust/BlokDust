module Fayde.Controls.Internal {
    export interface IRange {
        Minimum: number;
        Maximum: number;
        Value: number;
        OnMinimumChanged(oldMin: number, newMin: number);
        OnMaximumChanged(oldMax: number, newMax: number);
        OnValueChanged(oldVal: number, newVal: number);
    }

    export interface IRangeCoercer {
        OnMinimumChanged(oldMinimum: number, newMinimum: number);
        OnMaximumChanged(oldMaximum: number, newMaximum: number);
        OnValueChanged(oldValue: number, newValue: number);
    }
    export class RangeCoercer implements IRangeCoercer {
        InitialMax: number = 1;
        InitialVal: number = 0;
        RequestedMax: number = 1;
        RequestedVal: number = 0;
        PreCoercedMax: number = 1;
        PreCoercedVal: number = 0;
        CoerceDepth = 0;

        get Minimum(): number { return this.Range.Minimum; }
        get Maximum(): number { return this.Range.Maximum; }
        get Value(): number { return this.Range.Value; }

        constructor(public Range: IRange, public OnCoerceMaximum: (val: any) => void, public OnCoerceValue: (val: any) => void) {
            this.PreCoercedMax = this.RequestedMax = this.InitialMax = Range.Maximum;
            this.PreCoercedVal = this.RequestedVal = this.InitialVal = Range.Value;
        }

        OnMinimumChanged(oldMinimum: number, newMinimum: number) {
            if (this.CoerceDepth === 0) {
                this.InitialMax = this.Maximum;
                this.InitialVal = this.Value;
            }
            this.CoerceDepth++;
            this.CoerceMaximum();
            this.CoerceValue();
            this.CoerceDepth--;
            if (this.CoerceDepth > 0)
                return;

            this.Range.OnMinimumChanged(oldMinimum, newMinimum);
            var max = this.Maximum;
            if (!NumberEx.AreClose(this.InitialMax, max))
                this.Range.OnMaximumChanged(this.InitialMax, max);
            var val = this.Value;
            if (!NumberEx.AreClose(this.InitialVal, val))
                this.Range.OnValueChanged(this.InitialVal, val);
        }
        OnMaximumChanged(oldMaximum: number, newMaximum: number) {
            if (this.CoerceDepth === 0) {
                this.RequestedMax = newMaximum;
                this.InitialMax = oldMaximum;
                this.InitialVal = this.Value;
            }
            this.CoerceDepth++;
            this.CoerceMaximum();
            this.CoerceValue();
            this.CoerceDepth--;
            if (this.CoerceDepth !== 0)
                return;

            this.PreCoercedMax = newMaximum;
            var max = this.Maximum;
            if (!NumberEx.AreClose(this.InitialMax, max))
                this.Range.OnMaximumChanged(this.InitialMax, max);
            var val = this.Value;
            if (!NumberEx.AreClose(this.InitialVal, val))
                this.Range.OnValueChanged(this.InitialVal, val);
        }
        OnValueChanged(oldValue: number, newValue: number) {
            if (this.CoerceDepth === 0) {
                this.RequestedVal = newValue;
                this.InitialVal = oldValue;
            }
            this.CoerceDepth++;
            this.CoerceValue();
            this.CoerceDepth--;
            if (this.CoerceDepth !== 0)
                return;

            this.PreCoercedVal = newValue;
            var val = this.Value;
            if (!NumberEx.AreClose(this.InitialVal, val))
                this.Range.OnValueChanged(this.InitialVal, val);
        }

        CoerceMaximum() {
            var min = this.Minimum;
            var max = this.Maximum;
            if (!NumberEx.AreClose(this.RequestedMax, max) && this.RequestedMax >= min)
                this.OnCoerceMaximum(this.RequestedMax);
            else if (max < min)
                this.OnCoerceMaximum(min);
        }
        CoerceValue() {
            var min = this.Minimum;
            var max = this.Maximum;
            var val = this.Value;
            if (!NumberEx.AreClose(this.RequestedVal, val) && this.RequestedVal >= min && this.RequestedVal <= max)
                this.OnCoerceValue(this.RequestedVal);
            else if (val < min)
                this.OnCoerceValue(min);
            else if (val > max)
                this.OnCoerceValue(max);
        }
    }
}