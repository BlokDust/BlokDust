import IBlock = require("../Blocks/IBlock");

class InfoViewModel extends Fayde.MVVM.ViewModelBase {

    private _SelectedBlock: IBlock;

    get SelectedBlock(): IBlock{
        return this._SelectedBlock;
    }

    set SelectedBlock(value: IBlock){
        this._SelectedBlock = value;
        this.OnPropertyChanged("SelectedBlock");
    }

    constructor() {
        super();

    }
}

export = InfoViewModel;