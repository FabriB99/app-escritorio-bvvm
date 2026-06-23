const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");
const https = require("https");

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const obtenerDatosEstacion = () => {
  return new Promise((resolve, reject) => {
    https.get("https://www.5900.com.ar/clima/clientraw.txt", (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', (err) => reject(err));
  });
};

exports.actualizarClimaEstacion = onSchedule("every 1 minutes", async (event) => {
  try {
    const text = await obtenerDatosEstacion();
    const data = text.split(" ");

    if (data[0] !== "12345") {
      logger.error("Formato inválido de la estación 5900.");
      return;
    }

    const climaData = {
      temperatura: parseFloat(data[4]),
      tendenciaTemp: parseFloat(data[143] || 0),
      sensacion: parseFloat(data[44]),
      humedad: parseInt(data[5], 10),
      tendenciaHum: parseFloat(data[144] || 0),
      presion: parseFloat(data[6]),
      tendenciaPresion: parseFloat(data[50] || 0),
      lluvia: parseFloat(data[7]),
      viento: parseFloat(data[1]),  // Directo en km/h (promedio estable de 10 min)
      rafagas: parseFloat(data[2]),  // Directo en km/h (ráfaga del momento)
      direccion: parseInt(data[3], 10),
      iconoNum: parseInt(data[48], 10),
      actualizadoEn: admin.firestore.FieldValue.serverTimestamp()
    };

    await admin.firestore()
      .collection("config_guardia")
      .doc("clima_estacion")
      .set(climaData);

    logger.log("Clima actualizado en Firestore.");
  } catch (error) {
    logger.error("Fallo al obtener datos:", error);
  }
});