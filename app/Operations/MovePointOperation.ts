/// <reference path="../refs" />

import IUndoableOperation = require("./IUndoableOperation");
import ObservableCollection = Fayde.Collections.ObservableCollection;

class MovePointOperation implements IUndoableOperation
{
    private _Point: Point;
    private _OldPos: Point;
    private _NewPos: Point;

    constructor(point: Point, oldPos: Point, newPos: Point) {
        this._Point = point;
        this._OldPos = oldPos;
        this._NewPos = newPos;
    }

    Do(): Promise<Point> {
        var that = this;

        return new Promise((resolve) => {

            that._Point.X = that._NewPos.X;
            that._Point.Y = that._NewPos.Y;

            console.log("oldpos: " + that._OldPos.X);
            console.log("newpos: " + that._NewPos.X);

            resolve(that._Point);
        });
    }

    Undo(): Promise<Point> {
        var that = this;

        return new Promise((resolve) => {

            that._Point.X = that._OldPos.X;
            that._Point.Y = that._OldPos.Y;

            console.log("oldpos: " + that._OldPos.X);
            console.log("newpos: " + that._NewPos.X);

            resolve(that._Point);
        });
    }
}

export = MovePointOperation;