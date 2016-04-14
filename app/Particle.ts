import Vector = Utils.Maths.Vector;
import {IApp} from './IApp';
import {IBlock} from './Blocks/IBlock';
import {IPooledObject} from './Core/Resources/IPooledObject';
import {Logic} from './Blocks/Power/Logic/Logic';
import {ParticleEmitter} from './Blocks/Power/ParticleEmitter';
import {Source} from './Blocks/Source';
import {Void} from './Blocks/Power/Void';
import Point = etch.primitives.Point;

declare var App: IApp;

export class Particle implements IPooledObject {

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
        this.Position.x += (this.Vector.X * App.Unit);
        this.Position.y += (this.Vector.Y * App.Unit);
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

            if (block instanceof Void) {
                if (block.HitTest(point)){
                    this.Dispose();
                    return;
                }
            }

            // Particle can only collide with Switches and Sources but not Particle Emitters
            if (block instanceof Logic || block instanceof Source && !(block instanceof ParticleEmitter)) {
                if (block.HitTest(point)){
                    block.ParticleCollision(particle);
                    return;
                }
            }
        }
    }
}