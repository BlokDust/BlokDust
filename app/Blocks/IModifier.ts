import IModifiable = require("./IModifiable");

interface IModifier {
    Targets: Array<IModifiable>;
}

export = IModifier;