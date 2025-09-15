import express from "express";
import bodyParser from "body-parser";
import nodemailer from "nodemailer";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware
// Middleware con Express nativo
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));


// Servir la carpeta "public"
app.use(express.static("public"));

// Ruta principal (sirve index.html automáticamente)
app.get("/", (req, res) => {
  res.sendFile(path.resolve("public/index.html"));
});

// Tu código de nodemailer aquí ↓
app.post("/send", async (req, res) => {
  const { imageBase64, side } = req.body;

  try {
    let transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // contraseña de aplicación
      },
    });

    await transporter.sendMail({
      from: "sublidesingwvr@gmail.com",
      to: "TU_CORREO@gmail.com",
      subject: "Imagen enviada desde el formulario",
      text: `Se envió la imagen del lado: ${side}`,
      attachments: [
        {
          filename: `placa-${side}.png`,
          content: imageBase64.split("base64,")[1],
          encoding: "base64",
        },
      ],
    });

    res.json({ success: true, message: "Correo enviado con éxito" });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: "Error al enviar correo" });
  }
});


app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
