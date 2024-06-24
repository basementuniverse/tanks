import InputManager from '@basementuniverse/input-manager';
import { clamp } from '@basementuniverse/utils';
import { vec as vec2 } from '@basementuniverse/vec';
import { Object3D, PerspectiveCamera, Vector3 as vec3 } from 'three';
import Game from './Game';

export class Camera {
  private static readonly YAW_SPEED: number = 0.008;

  private static readonly PITCH_SPEED: number = -0.0005;

  private static readonly ZOOM_SPEED: number = 3.5;

  private static readonly LERP_AMOUNT: number = 0.05;

  private static readonly MIN_DISTANCE = 40;

  private static readonly MAX_DISTANCE = 120;

  private static readonly MIN_PITCH = -1.2;

  private static readonly MAX_PITCH = -0.2;

  public pivot: Object3D;

  public camera: PerspectiveCamera;

  private yaw: Object3D;

  private pitch: Object3D;

  private previousMousePosition: vec2 = vec2();

  public constructor(public followTarget: Object3D) {
    const aspectRatio = Game.screen.x / Game.screen.y;
    this.camera = new PerspectiveCamera(50, aspectRatio, 1, 1000);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, 10, 50);

    this.pivot = new Object3D();
    this.pivot.position.set(
      followTarget.position.x,
      followTarget.position.y,
      followTarget.position.z
    );

    this.yaw = new Object3D();
    this.pitch = new Object3D();

    this.pivot.add(this.yaw);
    this.yaw.add(this.pitch);
    this.pitch.add(this.camera);

    this.previousMousePosition = vec2.cpy(InputManager.mousePosition);
  }

  public update() {
    const mouseDelta = vec2.sub(
      this.previousMousePosition,
      InputManager.mousePosition
    );
    this.previousMousePosition = vec2.cpy(InputManager.mousePosition);

    this.yaw.rotation.y += mouseDelta.x * Camera.YAW_SPEED;
    this.pitch.rotation.x = clamp(
      this.pitch.rotation.x - mouseDelta.y * Camera.PITCH_SPEED,
      Camera.MIN_PITCH,
      Camera.MAX_PITCH
    );

    let mouseWheel = 0;
    if (InputManager.mouseWheelUp()) {
      mouseWheel = -1;
    }
    if (InputManager.mouseWheelDown()) {
      mouseWheel = 1;
    }

    this.camera.position.z = clamp(
      this.camera.position.z - mouseWheel * Camera.ZOOM_SPEED,
      Camera.MIN_DISTANCE,
      Camera.MAX_DISTANCE
    );

    const targetPosition = new vec3();
    this.followTarget.getWorldPosition(targetPosition);
    this.pivot.position.lerp(targetPosition, Camera.LERP_AMOUNT);
  }

  public resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
