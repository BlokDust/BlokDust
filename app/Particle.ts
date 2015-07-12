import IPooledObject = require("./Core/Resources/IPooledObject");
import IBlock = require("./Blocks/IBlock");
import Source = require("./Blocks/Source");
import Logic = require("./Blocks/Power/Logic/Logic");
import ParticleEmitter = require("./Blocks/Power/ParticleEmitter");
import Vector = Utils.Maths.Vector;

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

    ParticleCollision(point: Point, particle: Particle) {
        for (var i = App.Blocks.length - 1; i >= 0 ; i--){

            var block: IBlock = App.Blocks[i];

            // Particle can only collide with Switches and Sources but not Particle Emitters
            if (block instanceof Logic || block instanceof Source && !(block instanceof ParticleEmitter)) {
                if (block.HitTest(point)){
                    block.ParticleCollision(particle);
                }
            }

        }
    }
}

export = Particle;