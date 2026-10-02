const axios = require('axios');

const generateHTML = (title, message, code = '') => {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 10px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://powerhubskomielna.pl/images/logo.png" alt="Powerhub 24-7" style="max-width: 200px;" />
      </div>
      <div style="background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <h2 style="color: #2D3748; text-align: center; margin-bottom: 20px;">${title}</h2>
        <p style="color: #4A5568; font-size: 16px; line-height: 1.5; text-align: center;">
          ${message.replace(/\n/g, '<br/>')}
        </p>
        ${code ? `
          <div style="margin-top: 30px; text-align: center;">
            <span style="display: inline-block; background-color: #2B6CB0; color: #ffffff; font-size: 24px; font-weight: bold; padding: 15px 30px; border-radius: 8px; letter-spacing: 2px;">
              ${code}
            </span>
          </div>
        ` : ''}
      </div>
      <div style="text-align: center; margin-top: 20px; color: #A0AEC0; font-size: 12px;">
        &copy; ${new Date().getFullYear()} Powerhub 24-7. Wszelkie prawa zastrzeżone.
      </div>
    </div>
  `;
};

const sendEmail = async (to, subject, text, title, code = '') => {
  if (!process.env.BREVO_API_KEY) {
    console.warn("BRAK KLUCZA BREVO_API_KEY. Używam tradycyjnego Nodemailer'a (może zostać zablokowany przez Render)");
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_EMAIL, pass: process.env.SMTP_PASSWORD },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000
    });
    return transporter.sendMail({
      from: '"Powerhub 24-7" <' + process.env.SMTP_EMAIL + '>',
      to,
      subject,
      text,
      html: generateHTML(title || subject, text, code)
    });
  }

  // WYSYŁKA PRZEZ BREVO API (Omija blokadę SMTP Rendera!)
  const payload = {
    sender: { name: "Powerhub 24-7", email: process.env.SMTP_EMAIL },
    to: [{ email: to }],
    subject: subject,
    htmlContent: generateHTML(title || subject, text, code)
  };

  try {
    const response = await axios.post('https://api.brevo.com/v3/smtp/email', payload, {
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      }
    });
    console.log("Email wysłany przez Brevo:", response.data);
    return response.data;
  } catch (error) {
    console.error("Błąd Brevo API:", error.response ? error.response.data : error.message);
    throw error;
  }
};

module.exports = { sendEmail };
