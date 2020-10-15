/* eslint-disable require-jsdoc */
import {Quaternion} from "three/src/math/Quaternion";
import {Sprite} from "three/src/objects/Sprite";
import {Vector3} from "three/src/math/Vector3";

import {SpriteMaterial} from "three/src/materials/SpriteMaterial";
import {Texture} from "three/src/textures/Texture";





function Marker(
  pointerPosition,
  normal,
  cameraPosition,
  cameraTarget,
  cameraQuaternion,
  message,
  sprite
) {
  this.pointerPos = new Vector3();
  this.pointerPos.copy(pointerPosition);

  this.faceNormal = new Vector3();
  this.faceNormal.copy(normal);

  this.cameraPos = new Vector3();
  this.cameraPos.copy(cameraPosition);

  this.cameraTarget = new Vector3();
  this.cameraTarget.copy(cameraTarget);

  this.cameraQuaternion = new Quaternion();
  this.cameraQuaternion.copy(cameraQuaternion);

  this.message = message;
  this.sprite = sprite;
}

function makeTextSprite(
  message,
  {
    fontface = "Arial",
    fontsize = 18,
    borderThickness = 8,
    borderColor = { r: 0, g: 0, b: 0, a: 1.0 },
    backgroundColor = { r: 255, g: 255, b: 255, a: 1.0 },
    fillStyle,
    name
  }
) {
  const canvas = document.createElement("canvas");
  const size = 100; // Power of 2 has good performance on three.js
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  context.font = "Bold " + fontsize + "px " + fontface;

  // get size data (height depends only on font size)
  // const metrics = context.measureText(message);
  // const textWidth = metrics.width;

  // background color
  context.fillStyle =
    "rgba(" +
    backgroundColor.r +
    "," +
    backgroundColor.g +
    "," +
    backgroundColor.b +
    "," +
    backgroundColor.a +
    ")";
  // border color
  context.strokeStyle =
    "rgba(" +
    borderColor.r +
    "," +
    borderColor.g +
    "," +
    borderColor.b +
    "," +
    borderColor.a +
    ")";

  context.lineWidth = borderThickness;

  circle(
    context,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2 - borderThickness,
    0,
    2 * Math.PI
  );
  // 1.4 is extra height factor for text below baseline: g,j,p,q.

  // text color
  context.fillStyle = fillStyle;

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(message, canvas.width / 2 - 2, canvas.height / 2 + 4);

  // canvas contents will be used for a texture
  const texture = new Texture(canvas);
  texture.needsUpdate = true;

  const spriteMaterial = new SpriteMaterial({
    map: texture,
    // useScreenCoordinates: false,
    depthTest: false
  });

  const sprite = new Sprite(spriteMaterial);
  sprite.scale.set(50, 50, 1.0);
  sprite.name = `${name}_${message}`;
  return sprite;
}

/*
 * x: The x-coordinate of the center of the circle
 * y: The y-coordinate of the center of the circle
 * r: The radius of the circle
 * sAngle: The starting angle, in radians (0 is at the 3 o'clock position of the arc's circle)
 * eAngle: The ending angle, in radians
 * counterclockwise: Optional.
 *                   Specifies whether the drawing should be counterclockwise or clockwise.
 *                   False is default, and indicates clockwise, while true indicates counter-clockwise.
 */
function circle(ctx, x, y, r, sAngle, eAngle, counterclockwise) {
  ctx.beginPath();
  ctx.arc(x, y, r, sAngle, eAngle, counterclockwise);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

export { Marker, makeTextSprite }; // from makeTextSprite;
