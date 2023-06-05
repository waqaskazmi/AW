const nodemailer = require("nodemailer");

const sendEmail = async (email, subject, text) => {
  const transporter = nodemailer.createTransport({
    host: process.env.HOST,
    port: 587,
    auth: {
      user: process.env.USER,
      pass: process.env.PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const mailDetails = {
    from: process.env.USER,
    to: email,
    subject,
    text,
  };

  try {
    console.log("Sending your email...");
    
    console.log("mail details...", mailDetails);


    await transporter.sendMail(mailDetails);
    console.log(`Email sent successfully to ${mailDetails.to}`);
  } catch (error) {
    console.log("Sorry, failed to send your email!");
    return "error";
  }
};

module.exports = sendEmail;
