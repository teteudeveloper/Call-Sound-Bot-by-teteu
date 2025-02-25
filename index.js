const { Client } = require('discord.js-selfbot-v13');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require("fs");

process.on("uncaughtException", (err) => console.error(err));
process.on("unhandledRejection", (err) => console.error(err));

const tokens = fs.readFileSync("token.txt", { encoding: 'utf8' }).split("\n").map(token => token.trim());
const channels = fs.readFileSync("canais.txt", { encoding: 'utf8' }).split("\n").map(channel => channel.trim());

async function connectToVoiceChannel(client, channelId) {
    try {
        const channel = await client.channels.fetch(channelId);  

        if (!channel || !channel.isVoice()) {
            console.error(`Canal com ID ${channelId} não encontrado ou não é um canal de voz.`);
            return;
        }

        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
            group: client.user?.id,
            selfDeaf: false,
        });

        const resource = createAudioResource('media/gastação.mp3', {
            inputType: 'ffmpeg',
            inlineVolume: true,
            volume: 0.5, 
            ffmpegArgs: [
                '-analyzeduration', '0',
                '-loglevel', '0',
                '-f', 's16le',
                '-ar', '48000',
                '-ac', '2'
            ],
            encoderArgs: ['-c:a', 'libopus', '-b:a', '96K'],
            outputArgs: ['-f', 'opus'],
        });

        const player = createAudioPlayer();
        connection.subscribe(player);
        player.play(resource);

        connection.on("error", (error) => {
            console.error("Ocorreu um erro na conexão de voz:", error);
        });

        connection.on("disconnect", async (error) => {
            if (error) {
                console.error("Desconectado inesperadamente:", error);
            }
            console.log("Tentando reconectar à chamada...");
            await reconnectToVoiceChannel(client, channelId);
        });

        player.on(AudioPlayerStatus.Idle, () => {
            console.log("Áudio finalizado.");
            connection.destroy();  
        });

    } catch (error) {
        console.error("Erro ao tentar se conectar ao canal de voz:", error);
    }
}

async function reconnectToVoiceChannel(client, channelId) {
    try {
        console.log(`Tentando reconectar ao canal de voz: ${channelId}`);
        await connectToVoiceChannel(client, channelId);  
    } catch (error) {
        console.error("Falha na reconexão. Tentando novamente em 10 segundos...", error);
        setTimeout(() => reconnectToVoiceChannel(client, channelId), 10000);  
    }
}

async function startClient(token, index) {
    const client = new Client({ checkUpdate: false });

    client.on("ready", async () => {
        console.log(`Bot ${client.user.tag} está pronto para usar!`);
        const channelId = channels[index % channels.length];  

        await connectToVoiceChannel(client, channelId);

        client.user.setStatus("dnd");
        console.log(`Logado com: ${client.user.tag} - Estou on na call: ${channelId}`);
    });

    try {
        await client.login(token);
    } catch (erro) {
        console.log(`Não foi possível logar com o token: ${token.slice(0, 5)}... De número ${index + 1}`);
        console.error(erro);
    }
}

tokens.forEach((token, index) => {
    startClient(token, index);
});
