function togglePassword(id) {
  const input = document.getElementById(id);
  const icon = document.getElementById(id + "-toggle");

  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove("fa-eye");
    icon.classList.add("fa-eye-slash");
  } else {
    input.type = "password";
    icon.classList.remove("fa-eye-slash");
    icon.classList.add("fa-eye");
  }
}

document.getElementById("password").addEventListener("input", function (e) {
  const password = e.target.value;
  const strengthBar = document.getElementById("strength-bar");
  const strengthText = document.getElementById("strength-text");

  let strength = 0;

  if (password.length >= 6) strength++;               // length rule
  if (/[A-Z]/.test(password)) strength++;             // uppercase rule
  if (/[0-9]/.test(password)) strength++;             // number rule
  if (/[^A-Za-z0-9]/.test(password)) strength++;      // special char rule

  // Update strength UI
  switch (strength) {
    case 0:
      strengthBar.style.width = "0%";
      strengthBar.className = "h-1 bg-red-500 rounded-full w-0 transition-all duration-300";
      strengthText.textContent = "Password strength: Weak";
      break;
    case 1:
      strengthBar.style.width = "25%";
      strengthBar.className = "h-1 bg-red-500 rounded-full transition-all duration-300";
      strengthText.textContent = "Password strength: Weak";
      break;
    case 2:
      strengthBar.style.width = "50%";
      strengthBar.className = "h-1 bg-yellow-500 rounded-full transition-all duration-300";
      strengthText.textContent = "Password strength: Medium";
      break;
    case 3:
      strengthBar.style.width = "75%";
      strengthBar.className = "h-1 bg-blue-500 rounded-full transition-all duration-300";
      strengthText.textContent = "Password strength: Strong";
      break;
    case 4:
      strengthBar.style.width = "100%";
      strengthBar.className = "h-1 bg-green-500 rounded-full transition-all duration-300";
      strengthText.textContent = "Password strength: Very Strong";
      break;
  }
});