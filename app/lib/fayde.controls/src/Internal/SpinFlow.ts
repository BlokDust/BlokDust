module Fayde.Controls.Internal {
    export interface ISpinOwner extends UIElement {
        OnSpin();
        OnIncrement();
        OnDecrement();
    }
    export interface ISpinFlow {
        UpdateValid(increase: boolean, decrease: boolean);
        Dispose();
    }
    export class SpinFlow implements ISpinFlow {
        constructor(public Owner: ISpinOwner, public Spinner: Spinner) {
            if (this.Owner) {
                this.Owner.KeyDown.on(this.OnKeyDown, this);
                this.Owner.MouseWheel.on(this.OnMouseWheel, this);
            }
            if (this.Spinner)
                this.Spinner.Spin.on(this.Spinner_Spin, this);
        }

        UpdateValid(increase: boolean, decrease: boolean) {
            var validSpinDirections = ValidSpinDirections.None;
            if (increase)
                validSpinDirections |= ValidSpinDirections.Increase;
            if (decrease)
                validSpinDirections |= ValidSpinDirections.Decrease;
            if (this.Spinner)
                this.Spinner.ValidSpinDirection = validSpinDirections;
        }
        Dispose() {
            if (this.Owner) {
                this.Owner.KeyDown.off(this.OnKeyDown, this);
                this.Owner.MouseWheel.off(this.OnMouseWheel, this);
            }
            if (this.Spinner)
                this.Spinner.Spin.on(this.Spinner_Spin, this);
        }
        
        private OnKeyDown(sender, e: Fayde.Input.KeyEventArgs) {
            if (e.Handled)
                return;
            switch (e.Key) {
                case Fayde.Input.Key.Enter:
                    this.Owner.OnSpin();
                    e.Handled = true;
                    break;
                case Fayde.Input.Key.Up:
                    this.DoIncrement();
                    e.Handled = true;
                    break;
                case Fayde.Input.Key.Down:
                    this.DoDecrement();
                    e.Handled = true;
                    break;
            }
        }
        private OnMouseWheel(sender, e: Fayde.Input.MouseWheelEventArgs) {
            if (e.Handled)
                return;
            if (e.Delta < 0)
                this.DoDecrement();
            else if (0 < e.Delta)
                this.DoIncrement();
            e.Handled = true;
        }

        private Spinner_Spin(sender: any, e: SpinEventArgs) {
            this.Owner.OnSpin();
            if (!this.Spinner)
                return;
            if (e.Direction === SpinDirection.Increase)
                this.DoIncrement();
            else
                this.DoDecrement();
        }
        
        private DoIncrement() {
            if (this.Spinner && (this.Spinner.ValidSpinDirection & ValidSpinDirections.Increase) === ValidSpinDirections.Increase)
                this.Owner.OnIncrement();
        }
        private DoDecrement() {
            if (this.Spinner && (this.Spinner.ValidSpinDirection & ValidSpinDirections.Decrease) === ValidSpinDirections.Decrease)
                this.Owner.OnDecrement();
        }
    }
}