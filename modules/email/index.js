const emailService = require("./emailSerevice");

// Initialize with environment variables if they exist
if (
  process.env.EMAIL_SERVICE &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASSWORD
) {
  emailService.initialize({});
}

module.exports = emailService;
