import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import sgMail from "@sendgrid/mail";
import axios from "axios";
import FormData from "form-data";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

app.use(bodyParser.json({ limit: "15mb" }));
app.use(express.static("public"));

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

// Utilidad para generar nombres únicos
function saveBase64ToFile(base64Data, prefix) {
  const filename = `${prefix}_${Date.now()}.png`;
  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, Buffer.from(base64Data.split(",")[1], "base64"));
  return filePath;
}

// 📧 Ruta: enviar correo con SendGrid
app.post("/send-email", async (req, res) => {
  try {
    const { email, frontDataUrl, backDataUrl } = req.body;
    if (!email || !frontDataUrl || !backDataUrl) {
      return res.status(400).json({ success: false, error: "Faltan datos" });
    }

    const msg = {
      to: email,
      from: process.env.EMAIL_USER,
      subject: "Tu placa personalizada",
      text: "Aquí tienes la vista frontal y trasera de tu placa.",
      attachments: [
        {
          content: frontDataUrl.split(",")[1],
          filename: "placa-frente.png",
          type: "image/png",
          disposition: "attachment",
        },
        {
          content: backDataUrl.split(",")[1],
          filename: "placa-respaldo.png",
          type: "image/png",
          disposition: "attachment",
        },
      ],
    };

    await sgMail.send(msg);
    res.json({ success: true, message: "Correo enviado correctamente" });
  } catch (err) {
    console.error(
      "❌ Error en /send-email:",
      err.response?.body || err.message
    );
    res.status(500).json({ success: false, error: err.message });
  }
});

// 📲 Ruta: enviar WhatsApp con Meta API
app.post("/send-whatsapp", async (req, res) => {
  try {
    const { whatsapp, frontDataUrl, backDataUrl } = req.body;
    if (!whatsapp || !frontDataUrl || !backDataUrl) {
      return res.status(400).json({ success: false, error: "Faltan datos" });
    }

    // Guardar imágenes temporalmente
    const frontPath = saveBase64ToFile(frontDataUrl, "placa-frente");
    const backPath = saveBase64ToFile(backDataUrl, "placa-respaldo");

    // Función: subir a WhatsApp
    const uploadToWhatsApp = async (filePath) => {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));
      formData.append("messaging_product", "whatsapp");

      const resp = await axios.post(
        `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            ...formData.getHeaders(),
          },
        }
      );
      return resp.data.id;
    };

    const mediaIdFront = await uploadToWhatsApp(frontPath);
    const mediaIdBack = await uploadToWhatsApp(backPath);

    // Enviar ambas imágenes
    for (const mediaId of [mediaIdFront, mediaIdBack]) {
      await axios.post(
        `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: whatsapp,
          type: "image",
          image: { id: mediaId },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Enviar mensaje de texto final
    await axios.post(
      `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to: whatsapp,
        type: "text",
        text: {
          body: "✅ Aquí tienes tu diseño de placa. Gracias por usar el personalizador.",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({ success: true, message: "WhatsApp enviado correctamente" });
  } catch (err) {
    console.error(
      "❌ Error en /send-whatsapp:",
      err.response?.data || err.message
    );
    res.status(500).json({ success: false, error: err.message });
  }
});

// 🌐 Ruta Webhook (verificación inicial de Meta)
app.get("/webhook", (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN; // ponlo en tu .env

  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("✅ Webhook verificado");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 📩 Ruta Webhook (mensajes entrantes)
app.post("/webhook", (req, res) => {
  try {
    const body = req.body;
    console.log("📨 Mensaje entrante:", JSON.stringify(body, null, 2));

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const from = message.from; // número del cliente
        const msg_body = message.text?.body; // texto enviado

        console.log(`👤 Cliente: ${from}, Mensaje: ${msg_body}`);
      }

      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (error) {
    console.error("❌ Error en webhook:", error.message);
    res.sendStatus(500);
  }
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
