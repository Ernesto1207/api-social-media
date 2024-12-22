import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Ruta base
app.get('/', (req, res) => {
    res.send({ message: '¡Bienvenido a la API de TikTok y más!' });
});

// **Funciones auxiliares**
// Obtener el ID del video
const getIdVideo = (url) => {
    const matching = url.includes("/video/");
    let idVideo = url.substring(url.indexOf("/video/") + 7, url.indexOf("/video/") + 26);
    if (!matching) {
        return null;
    }
    return idVideo.length > 19 ? idVideo.substring(0, idVideo.indexOf("?")) : idVideo;
};

// **Rutas principales**
// Obtener información del video de TikTok
app.post('/get-video-id', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).send({ error: 'URL no proporcionada' });
    }

    const idVideo = getIdVideo(url);
    if (!idVideo) {
        return res.status(400).send({ error: 'URL no válida' });
    }

    const API_URL = `https://api22-normal-c-alisg.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}&iid=7318518857994389254&device_id=7318517321748022790&channel=googleplay&app_name=musical_ly&version_code=300904&device_platform=android&device_type=ASUS_Z01QD&version=9`;

    try {
        const response = await fetch(API_URL, { method: "OPTIONS" });
        const body = await response.text();
        const data = JSON.parse(body);

        if (!data.aweme_list || data.aweme_list.length === 0) {
            return res.status(404).send({ error: 'Video no encontrado o eliminado' });
        }

        let videoUrl = data.aweme_list[0].video.play_addr.url_list[0];
        let thumbnailUrl = data.aweme_list[0].video.cover.url_list[0]; // Miniatura

        if (!videoUrl) {
            return res.status(500).send({ error: 'Error al obtener la URL del video' });
        }

        return res.send({ videoUrl, thumbnailUrl, videoId: idVideo });
    } catch (error) {
        return res.status(500).send({ error: 'Error al obtener el video' });
    }
});

// Descargar un video por ID
app.get('/download/:idVideo', async (req, res) => {
    const { idVideo } = req.params;

    if (!idVideo) {
        return res.status(400).send({ error: 'ID del video no proporcionado' });
    }

    const API_URL = `https://api22-normal-c-alisg.tiktokv.com/aweme/v1/feed/?aweme_id=${idVideo}&iid=7318518857994389254&device_id=7318517321748022790&channel=googleplay&app_name=musical_ly&version_code=300904&device_platform=android&device_type=ASUS_Z01QD&version=9`;

    try {
        const response = await fetch(API_URL, { method: "OPTIONS" });
        const body = await response.text();
        const data = JSON.parse(body);

        if (!data.aweme_list || data.aweme_list.length === 0) {
            return res.status(404).send({ error: 'Video no encontrado o eliminado' });
        }

        let videoUrl = data.aweme_list[0].video.play_addr.url_list[0];

        if (!videoUrl) {
            return res.status(500).send({ error: 'Error al obtener la URL del video' });
        }

        const videoResponse = await axios({
            url: videoUrl,
            method: 'GET',
            responseType: 'stream',
        });

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename=${idVideo}.mp4`);
        videoResponse.data.pipe(res);
    } catch (error) {
        return res.status(500).send({ error: 'Error al descargar el video' });
    }
});

// **Rutas adicionales**
// Ejemplo de ruta estática
app.get('/saludo', (req, res) => {
    res.send({ saludo: '¡Hola desde la API mejorada!' });
});

// **Inicio del servidor**
app.listen(port, () => {
    console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
