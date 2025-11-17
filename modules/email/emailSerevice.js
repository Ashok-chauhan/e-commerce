const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transport = null;
    this.isInitialized = false;
  }

  // Initialize the email service
  initialize(config) {
    try {
      this.transport = nodemailer.createTransport(
        {
          host: config.service || process.env.EMAIL_SERVICE,
          port: process.env.EMAIL_PORT,
          secure: true,
          auth: {
            user: config.user || process.env.EMAIL_USER,
            pass: config.password || process.env.EMAIL_PASSWORD,
          },
        }

        /*
        host: "smtp.mail.yahoo.com", // Explicitly set Hotmail SMTP host
        port: 465, // TLS port
        secure: true, // STARTTLS
        auth: {
          user: "www.developer_web@yahoo.com",
          pass: "qvhlzitcitncfiaj",
        },
        */
      );

      // Verify connection configuration
      this.transport.verify((error) => {
        if (error) {
          console.error("Email service initialization failed: ", error);
          this.isInitialized = false;
        } else {
          console.log("Email service is ready to send messages");
          this.isInitialized = true;
        }
      });
    } catch (error) {
      console.error("Failed to initialize email service:", error);
      this.isInitialized = false;
    }
  }

  // Send email with attachements
  async sendEmail(options) {
    if (!this.isInitialized) {
      throw new Error(
        "Email service not initialized. Call initialise() first."
      );
    }

    const { to, subject, text, html, attachments } = options;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: Array.isArray(to) ? to.join(", ") : to,
      subject,
      text,
      html,
      attachments: attachments || [],
    };

    try {
      const info = await this.transport.sendMail(mailOptions);
      console.log("Email sent successfully: ", info.messageId);
      return info;
    } catch (error) {
      console.error("Error sending email: ", error);
      throw error;
    }
  }

  // Helper method to add file attachements
  createFileAttachment(filename, path, contentType = null) {
    return {
      filename,
      path,
      contentType,
    };
  }

  // Helper method to add fuffer attachments (for files in memory)
  createBufferAttachment(filename, content, contentType = null) {
    return {
      filename,
      content,
      contentType,
    };
  }
}

module.exports = new EmailService();
