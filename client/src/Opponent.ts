import { Vector3 as vec3 } from 'three';
import { PlayerState } from './GameScene';
import { Tank } from './Tank';

export class Opponent {
  public health: number = 100;

  constructor(
    public id: string,
    public name: string,
    public tank: Tank
  ) {}

  public onUpdate(state: PlayerState) {
    this.health = state.health;
    
    this.tank.onUpdate(
      new vec3(state.positionX, 0, state.positionZ),
      state.direction,
      state.turretDirection
    );
  }
}
