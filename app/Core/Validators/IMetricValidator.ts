import IValidator = require("./IValidator");

interface IMetricValidator extends IValidator{
    Metric: number;
}

export = IMetricValidator;