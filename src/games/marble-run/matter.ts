import Phaser from 'phaser';

interface EngineState extends MatterJS.Engine {
  world: MatterJS.World & MatterJS.CompositeType;
  gravity: { x: number; y: number; scale: number };
}
interface MatterRuntime {
  Engine: Omit<typeof MatterJS.Engine, 'create'> & {
    create(options: MatterJS.IEngineDefinition): EngineState;
  };
  Bodies: typeof MatterJS.Bodies;
  Body: Omit<typeof MatterJS.Body, 'create'> & {
    create(options: MatterJS.IBodyDefinition): MatterJS.BodyType;
  };
  Composite: typeof MatterJS.Composite;
  Constraint: typeof MatterJS.Constraint;
  Events: typeof MatterJS.Events;
  Query: typeof MatterJS.Query;
}
const Matter = (Phaser.Physics.Matter as unknown as { Matter: MatterRuntime }).Matter;
export default Matter;
