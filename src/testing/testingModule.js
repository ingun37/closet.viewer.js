/* eslint-disable require-jsdoc */

function testJsonOutput() {
  load('./test/trim.zrest');
  loadOutputJson('./test/trim.json');
}

function testTransparentBug() {
  load('shadow.zrest');
  setTimeout(function() {
    closet.viewer.loadTechPack();
  }, 2000);
  setTimeout(function() {
    closet.viewer.setAllPatternVisible(false);
    closet.viewer.setPatternVisible(6, true);
  }, 3000);
}
