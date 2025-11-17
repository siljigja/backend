const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^.{8,}$/;
const projectNameRegex = /^[A-Za-z0-9 _-]{3,64}$/;

const validateEmail = (email) => emailRegex.test(email);
const validatePassword = (password) => passwordRegex.test(password);
const validateProjectName = (name) => projectNameRegex.test(name);

module.exports = {
  validateEmail,
  validatePassword,
  validateProjectName
};

