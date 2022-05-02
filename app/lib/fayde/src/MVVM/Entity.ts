module Fayde.MVVM {
    export interface IEntity extends INotifyPropertyChanged, Data.INotifyDataErrorInfo {
        OnPropertyChanged (propertyName: string);
        AddError (propertyName: string, errorMessage: string);
        RemoveError (propertyName: string, errorMessage: string);
        ClearErrors (propertyName: string);
    }

    export class Entity implements IEntity {
        PropertyChanged = new nullstone.Event<PropertyChangedEventArgs>();

        OnPropertyChanged (propertyName: string) {
            this.PropertyChanged.raise(this, new PropertyChangedEventArgs(propertyName));
        }

        private _Errors: any = {};

        ErrorsChanged = new nullstone.Event<Data.DataErrorsChangedEventArgs>();

        get HasErrors (): boolean {
            return Object.keys(this._Errors).length > 0;
        }

        AddError (propertyName: string, errorMessage: string) {
            var errs = this._Errors[propertyName];
            if (!errs) {
                this._Errors[propertyName] = [errorMessage];
            } else {
                errs.push(errorMessage);
            }
            this.ErrorsChanged.raise(this, new Data.DataErrorsChangedEventArgs(propertyName));
        }

        RemoveError (propertyName: string, errorMessage: string) {
            var errs = this._Errors[propertyName];
            if (!errs)
                return;
            var index = errs.indexOf(errorMessage);
            if (index >= 0)
                errs.splice(index, 1);
            if (errs.length < 1)
                delete this._Errors[propertyName];
            this.ErrorsChanged.raise(this, new Data.DataErrorsChangedEventArgs(propertyName));
        }

        ClearErrors (propertyName: string) {
            var errs = this._Errors[propertyName];
            if (!errs)
                return;
            delete this._Errors[propertyName];
            this.ErrorsChanged.raise(this, new Data.DataErrorsChangedEventArgs(propertyName));
        }

        GetErrors (propertyName: string): nullstone.IEnumerable<string> {
            var errs = this._Errors[propertyName];
            if (!errs)
                return null;
            return nullstone.IEnumerable_.fromArray(errs);
        }

        static ApplyTo<TIn, TOut extends IEntity>(model: TIn): TOut {
            var out = <TOut><any>model;
            var proto = Entity.prototype;
            Object.defineProperties(out, {
                "_Errors": {value: {}},
                "HasErrors": {
                    get: function () {
                        return Object.keys(this._Errors).length > 0;
                    }
                }
            });

            out.PropertyChanged = new nullstone.Event<PropertyChangedEventArgs>();
            out.OnPropertyChanged = proto.OnPropertyChanged.bind(out);
            out.ErrorsChanged = new nullstone.Event<Data.DataErrorsChangedEventArgs>();
            out.AddError = proto.AddError.bind(out);
            out.RemoveError = proto.RemoveError.bind(out);
            out.ClearErrors = proto.ClearErrors.bind(out);
            out.GetErrors = proto.GetErrors.bind(out);

            Data.INotifyDataErrorInfo_.mark(out);

            return out;
        }
    }
    Data.INotifyDataErrorInfo_.mark(Entity);
}