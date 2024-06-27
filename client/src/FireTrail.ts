import {
  BufferGeometry,
  Line,
  LineBasicMaterial,
  Vector3 as vec3,
} from 'three';

export class FireTrail {
  public static readonly FIRE_TRAIL_Y = 8;

  private static readonly FIRE_TRAIL_THICKNESS = 12;

  public line: Line;

  constructor(public id: string, public start: vec3, public end: vec3) {
    const material = new LineBasicMaterial({
      color: 0xffcc00,
      linewidth: FireTrail.FIRE_TRAIL_THICKNESS,
      transparent: true,
      opacity: 0.5,
    });

    const geometry = new BufferGeometry().setFromPoints([start, end]);

    this.line = new Line(geometry, material);
  }
}
