const quill = new Quill("#editor", {
  theme: "snow",
  placeholder: "Description...",
});
// On form submit, copy HTML content to textarea
document.querySelector("form").addEventListener("submit", function () {
  document.querySelector("#description").value = quill.root.innerHTML;
});
