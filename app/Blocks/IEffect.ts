import IModifiable = require("IModifiable");

interface IEffect {

    Connect(modifiable: IModifiable): void;
    Disconnect(modifiable: IModifiable): void;

}

export = IEffect;
