/// <reference path="../refs" />

import IBlock = require("./IBlock");

class Block implements IBlock {

    public Id:number;
    public Click:Fayde.RoutedEvent<Fayde.RoutedEventArgs> = new Fayde.RoutedEvent<Fayde.RoutedEventArgs>();
    public Position:Point;
    public Radius:number = 20;
    public IsPressed:boolean = false;

    constructor(id:number, position:Point) {
        this.Id = id;
        this.Position = position;
    }

    Draw(ctx:CanvasRenderingContext2D) {

    }

    MouseDown() {
        this.IsPressed = true;
        this.Click.Raise(this, new Fayde.RoutedEventArgs());
    }

    MouseUp() {
        this.IsPressed = false;
    }

    MouseMove(point:Point) {
        if (this.IsPressed) {
            this.Position = point;
        }
    }

    HitTest(point:Point):boolean {
        var distance = Math.distanceBetween(this.Position.X, this.Position.Y, point.X, point.Y);

        if (distance <= this.Radius) {
            this.MouseDown();
            return true;
        }

        return false;
    }
}

export = Block;