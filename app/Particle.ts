/**
 * Created by luketwyman on 16/11/2014.
 */

import Vector = Fayde.Utils.Vector;

class Particle {

    public Life: number;
    public Vector: Vector;
    public Position: Point;
    public Size: number;

    constructor(position: Point, vector: Vector, size: number, life: number) {
        this.Position = position;
        this.Vector = vector;
        this.Size = size;
        this.Life = life;
    }

    Move() {
        this.Position.x += this.Vector.X;
        this.Position.y += this.Vector.Y;
    }

    Dispose() {
        this.Life = -1;
    }

}

export = Particle;