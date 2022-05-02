module Fayde.Navigation {
    export interface INavigate {
        Navigate(source: Uri): boolean;
    }
    export var INavigate_ = new nullstone.Interface<INavigate>("INavigate");
}