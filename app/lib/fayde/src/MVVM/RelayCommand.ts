/// <reference path="../Input/ICommand.ts" />

module Fayde.MVVM {
    export class RelayCommand implements Input.ICommand {
        constructor(execute?: (parameter: any) => void , canExecute?: (parameter: any) => boolean) {
            if (execute)
                this.Execute = execute;
            if (canExecute)
                this.CanExecute = canExecute;
        }

        Execute(parameter: any) { }
        CanExecute(parameter: any): boolean { return true; }
        CanExecuteChanged = new nullstone.Event();
        ForceCanExecuteChanged() {
            this.CanExecuteChanged.raise(this, null);
        }
    }
    Fayde.CoreLibrary.add(RelayCommand);
    nullstone.addTypeInterfaces(RelayCommand, Input.ICommand_);
}