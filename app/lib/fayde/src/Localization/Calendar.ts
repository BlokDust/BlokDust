/// <reference path="../Primitives/DateTime.ts" />

module Fayde.Localization {
    export class Calendar {
        ID: number = 1;
        Eras: number[] = [1];
        EraNames: string[] = ["A.D."];
        CurrentEraValue:number=1;
        TwoDigitYearMax: number = 2029;
        MaxSupportedDateTime = new DateTime(9999, 12, 31, 23, 59, 59, 999);
        MinSupportedDateTime = new DateTime(1, 1, 1, 0, 0, 0, 0);
    }
}