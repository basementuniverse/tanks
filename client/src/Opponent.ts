import { Vector3 as vec3 } from 'three';
import { PlayerState } from './GameScene';
import { Tank } from './Tank';

export class Opponent {
  constructor(public id: string, public tank: Tank) {}

  public onUpdate(state: PlayerState) {
    this.tank.onUpdate(
      new vec3(state.positionX, 0, state.positionZ),
      state.direction,
      state.turretDirection
    );
  }
}
