module Fayde.Input {
    export interface ICommand {
        Execute(parameter: any);
        CanExecute(parameter: any): boolean;
        CanExecuteChanged: nullstone.Event<nullstone.IEventArgs>;
    }
    export var ICommand_ = new nullstone.Interface<ICommand>("ICommand");
}