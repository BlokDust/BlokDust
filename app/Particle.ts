import IPooledObject = require("./Core/Resources/IPooledObject");
import Vector = Fayde.Utils.Vector;

class Particle implements IPooledObject {

    public Disposed: boolean = false;
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

    Reset(): boolean {
        this.Position = null;
        this.Vector = null;
        this.Size = null;
        this.Life = null;
        return true;
    }

    Dispose() {
        this.Life = -1;
        this.Disposed = true;
    }

    ReturnToPool(): void {

    }
}

export = Particle;