import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import axios from 'axios';
import instagramGetUrl from 'instagram-url-direct';
import path from 'path';
import https from 'https';

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors());

// Ruta base
app.get('/', (req, res) => {
    res.send({ message: '¡Bienvenido a la API de TikTok e Instagram!' });
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

// **Redirección HTTP para obtener URL completa**
const getFullUrl = async (shortUrl) => {
    try {
        // Hacer una solicitud GET al enlace corto para obtener la URL completa
        const response = await axios.get(shortUrl, { maxRedirects: 5 });
        const fullUrl = response.request.res.responseUrl; // URL completa después de la redirección

        return fullUrl;
    } catch (error) {
        console.error('Error al obtener la URL completa:', error);
        return null;
    }
};



// **Rutas principales**
// Obtener información del video de TikTok
app.post('/get-video-id', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).send({ error: 'URL no proporcionada' });
    }

    // Si la URL es corta, obtener la URL completa primero
    const fullUrl = await getFullUrl(url);

    if (!fullUrl) {
        return res.status(400).send({ error: 'No se pudo obtener la URL completa' });
    }

    // Extraer el ID del video de la URL completa
    const idVideo = getIdVideo(fullUrl);
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


// Obtener información de Instagram
app.post('/get-video-id-instagram', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).send({ error: 'URL no proporcionada' });
    }

    try {
        console.log('Obteniendo datos del enlace de Instagram...');
        const data = await instagramGetUrl(url);

        if (!data.url_list || data.url_list.length === 0) {
            return res.status(404).send({ error: 'No se encontró ningún archivo descargable en la URL proporcionada.' });
        }

        const fileUrl = data.url_list[0];
        const fileName = fileUrl.split('?')[0].split('/').pop(); // Extract file name
        const thumbnailUrl = data.media_details[0].thumbnail;
        return res.send({ videoUrl: fileUrl, videoName: fileName, thumbnail: thumbnailUrl });
    } catch (error) {
        return res.status(500).send({ error: 'Error al obtener el video de Instagram' });
    }
});

// Descargar un video de Instagram por URL
app.get('/download-instagram', async (req, res) => {
    const { url } = req.query; // URL directa del video

    if (!url) {
        return res.status(400).send({ error: 'URL no proporcionada' });
    }

    try {
        console.log(`📥 Descargando video desde: ${url}`);

        // Extraer el nombre del archivo
        const fileName = path.basename(url.split('?')[0]);
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        // Descargar y transmitir el archivo al cliente
        https.get(url, (response) => {
            response.pipe(res);

            response.on('end', () => {
                console.log('✅ Archivo descargado exitosamente.');
            });

            response.on('error', (err) => {
                console.error('❌ Error durante la descarga:', err.message);
                res.status(500).send({ error: 'Error durante la descarga del video.' });
            });
        }).on('error', (err) => {
            console.error('❌ Error al conectar con la URL:', err.message);
            res.status(500).send({ error: 'Error al conectar con la URL del video.' });
        });
    } catch (error) {
        console.error('❌ Se produjo un error:', error.message);
        res.status(500).send({ error: 'Error al procesar la solicitud.' });
    }
});



// **Inicio del servidor**
app.listen(port, () => {
    console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
