class FlashAnnotation {
  listFlashSprite = [];
  timerId = null;
  previousFrameBlinked = false;
  flashFrequency = 500;
  flashDuration = 10000;

  // NOTE:
  //  Original marker color : 1
  //  Selected(flashing) marker color : 0.5
  colorOrg = 1;
  colorSelected = 0.5;

  constructor(container, funcUpdateRenderer) {
    this.container = container;
    this.updateRenderer = funcUpdateRenderer.bind(this);
  }
  set = (listAnnotationName, bFlash = true) => {
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

  remove = (listAnnotationName) => {
    listAnnotationName.forEach((name) => {
      const sprite = this.getSprite(name);
      this.listFlashSprite
        .filter((item) => item == sprite)
        .forEach((sprite) => (sprite.material.color.r = this.colorOrg));
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

  setColor = (r) => {
    this.listFlashSprite.forEach((sprite) => {
      sprite.material.color.r = r;
    });
  };

  getSprite = (name) => {
    return this.container.getObjectByName("annotation_" + name);
  };

  hasSprite = (sprite) => {
    return this.listFlashSprite.indexOf(sprite);
  };
}

export default FlashAnnotation;
