/// <reference path="ViewModelBase" />

module Fayde.MVVM {
    export interface IDialogViewModelSettings<TAccept, TBuilder> {
        AcceptAction?: (data: TAccept) => any;
        CompleteAction?: (pars: IOverlayCompleteParameters) => any;
        ViewModelBuilder?: (builder: TBuilder) => any;
        CanOpen?: (builder: TBuilder) => boolean;
    }

    export class DialogViewModel<TBuilder, TAccept> extends ViewModelBase {
        IsOpen = false;
        OverlayDataContext: any = null;
        RequestOpenCommand: RelayCommand;
        ClosedCommand: RelayCommand;

        AcceptAction: (data: TAccept) => any;
        CompleteAction: (pars: IOverlayCompleteParameters) => any;
        ViewModelBuilder: (builder: TBuilder) => any;
        CanOpen: (builder: TBuilder) => boolean;

        constructor (settings?: IDialogViewModelSettings<TAccept, TBuilder>) {
            super();
            this.RequestOpenCommand = new RelayCommand(par => this.RequestOpen_Execute(par), par => this.RequestOpen_CanExecute(par));
            this.ClosedCommand = new RelayCommand(par => this.Closed_Execute(par));
            if (settings) {
                this.AcceptAction = settings.AcceptAction;
                this.CompleteAction = settings.CompleteAction;
                this.ViewModelBuilder = settings.ViewModelBuilder;
                this.CanOpen = settings.CanOpen;
            }
        }

        private Closed_Execute (parameter: IOverlayCompleteParameters) {
            if (parameter.Result === true) {
                this.AcceptAction && this.AcceptAction(<TAccept>parameter.Data || undefined);
            }
            this.CompleteAction && this.CompleteAction(parameter);
        }

        private RequestOpen_Execute (parameter: TBuilder) {
            if (this.ViewModelBuilder != null) {
                var vm = this.ViewModelBuilder(parameter);
                if (vm == null)
                    return;
                this.OverlayDataContext = vm;
            }
            this.IsOpen = true;
        }

        private RequestOpen_CanExecute (parameter: TBuilder): boolean {
            return !this.CanOpen || this.CanOpen(parameter);
        }
    }
    NotifyProperties(DialogViewModel, ["IsOpen", "OverlayDataContext", "RequestOpenCommand", "ClosedCommand"]);
}