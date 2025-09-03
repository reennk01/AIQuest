async function getCaption() {
  const fileInput = document.getElementById("imageUpload");
  const resultBox = document.getElementById("result");

  if (!fileInput.files.length) {
    resultBox.textContent = "Please upload an image first.";
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  reader.onloadend = async () => {
    try {
      const response = await fetch("ai-func-quest-fnfkevgqg5cphuhr.southeastasia-01.azurewebsites.net", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: reader.result }) // base64 image
      });

      const data = await response.json();
      resultBox.textContent = data.caption || "No caption found.";
    } catch (err) {
      resultBox.textContent = "Error: " + err.message;
    }
  };

  reader.readAsDataURL(file); // Convert image → base64
}
