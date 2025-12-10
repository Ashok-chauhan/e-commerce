function changeImage(thumbnail) {
  document.getElementById("currentImage").src = thumbnail.src;
}

function selectSwatch(productPicture) {
  document.getElementById(
    "currentImage"
  ).src = `${window.location.origin}/assets/images/${productPicture}`;
}
