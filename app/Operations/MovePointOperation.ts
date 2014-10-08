/// <reference path="../refs" />

import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class MovePointOperation implements IUndoableOperation
{
    private _Point: Point;
    private _OldX: number;
    private _OldY: number;
    private _NewX: number;
    private _NewY: number;

    constructor(point: Point, oldPos: Point, newPos: Point) {
        this._Point = point;
        this._OldX = oldPos.X;
        this._OldY = oldPos.Y;
        this._NewX = newPos.X;
        this._NewY = newPos.Y;
    }

    Do(): Promise<Point> {
        var that = this;

        return new Promise((resolve) => {

            that._Point.X = that._NewX;
            that._Point.Y = that._NewY;

            resolve(that._Point);
        });
    }

    Undo(): Promise<Point> {
        var that = this;

        return new Promise((resolve) => {

            that._Point.X = that._OldX;
            that._Point.Y = that._OldY;

            resolve(that._Point);
        });
    }
}

export = MovePointOperation;