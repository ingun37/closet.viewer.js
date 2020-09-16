import * as THREE from "../threejs/three";

class FlashAnnotation {
  listFlashSprite:THREE.Object3D[] = [];
  timerId:NodeJS.Timeout | null = null;
  previousFrameBlinked = false;
  flashFrequency = 500;
  flashDuration = 10000;

  // NOTE:
  //  Original marker color : 1
  //  Selected(flashing) marker color : 0.5
  colorOrg = 1;
  colorSelected = 0.5;

  constructor(
    public container:THREE.Object3D, 
    public updateRenderer:()=>void) {
  }
  set = (listAnnotationName:string[], bFlash = true) => {
    if (!bFlash) {
      this.remove(listAnnotationName);
      return;
    }
    listAnnotationName.forEach((name) => {
      const sprite = this.getSprite(name);
      if (sprite && this.hasSprite(sprite)) {
        this.listFlashSprite.push(sprite);
      }
    });

    this.timerId = setInterval(() => {
      this.loop();
    }, this.flashFrequency);
    setTimeout(() => {
      this.clear();
    }, this.flashDuration);
  };

  remove = (listAnnotationName:string[]) => {
    listAnnotationName.forEach((name) => {
      const sprite = this.getSprite(name);
      this.listFlashSprite
        .filter((item) => item == sprite)
        .forEach((sprite) => {
          if (sprite instanceof THREE.Sprite) {
            sprite.material.color.r = this.colorOrg;
          }
        });
      this.listFlashSprite = this.listFlashSprite.filter(
        (item) => item !== sprite
      );
    });
  };

  clear = () => {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.setColor(this.colorOrg);
    this.previousFrameBlinked = false;

    this.timerId = null;
    this.listFlashSprite = [];
  };

  loop = () => {
    this.updateColor();
    this.updateRenderer();
  };

  updateColor = () => {
    if (this.listFlashSprite.length <= 0) {
      this.clear();
      return;
    }
    const color = this.previousFrameBlinked
      ? this.colorOrg
      : this.colorSelected;

    console.log(color);
    this.setColor(color);
    this.previousFrameBlinked = !this.previousFrameBlinked;
  };

  setColor = (r:number) => {
    this.listFlashSprite.forEach((sprite) => {
      if (sprite instanceof THREE.Sprite) {
        sprite.material.color.r = r;
      }
    });
  };

  getSprite = (name:string) => {
    return this.container.getObjectByName("annotation_" + name);
  };

  hasSprite = (sprite:THREE.Object3D) => {
    return this.listFlashSprite.indexOf(sprite);
  };
}

export default FlashAnnotation;
