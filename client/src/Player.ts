import InputManager from '@basementuniverse/input-manager';
import { Vector3 as vec3 } from 'three';
import { Camera } from './Camera';
import { PlayerState } from './GameScene';
import { Tank } from './Tank';

export class Player {
  public thrust: number = 0;

  public turn: number = 0;

  public turretTurn: number = 0;

  public shoot: boolean = false;

  public health: number = 100;

  constructor(
    public id: string,
    public name: string,
    public tank: Tank
  ) {}

  public update(camera: Camera) {
    // Turret control
    let cameraWorldDirection: vec3 = new vec3();
    camera.camera.getWorldDirection(cameraWorldDirection);
    const cameraTheta = Math.atan2(
      cameraWorldDirection.x,
      cameraWorldDirection.z
    );

    let turretWorldDirection: vec3 = new vec3();
    this.tank.turret.getWorldDirection(turretWorldDirection);
    const turretTheta = Math.atan2(
      turretWorldDirection.x,
      turretWorldDirection.z
    );

    this.turretTurn = cameraTheta - turretTheta;
    if (this.turretTurn > Math.PI) {
      this.turretTurn -= Math.PI * 2;
    }
    if (this.turretTurn < -Math.PI) {
      this.turretTurn += Math.PI * 2;
    }

    // Thrust/brake control
    this.thrust = 0;
    if (InputManager.keyDown('KeyW') && !InputManager.keyDown('KeyS')) {
      this.thrust = 1;
    }
    if (InputManager.keyDown('KeyS') && !InputManager.keyDown('KeyW')) {
      this.thrust = -1;
    }

    // Turn control
    this.turn = 0;
    if (InputManager.keyDown('KeyA') && !InputManager.keyDown('KeyD')) {
      this.turn = 1;
    }
    if (InputManager.keyDown('KeyD') && !InputManager.keyDown('KeyA')) {
      this.turn = -1;
    }

    // Fire control
    this.shoot = InputManager.mousePressed();
  }

  public onUpdate(state: PlayerState) {
    this.health = state.health;
    
    this.tank.onUpdate(
      new vec3(state.positionX, 0, state.positionZ),
      state.direction,
      state.turretDirection
    );
  }
}
