const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch');
const fs = require('fs');

const ACCESS_TOKEN = 'sl.u.AGXfkHIIY599fhGzC6DbGMmkFSk9GYD0fSw-rot1G6GgHFDZpRJJhiij9YWuGypMNPsLslQ93Wsc517AwpwD6GW7p_nhu-ssCbMvl-rlYPU6CyPG3YN0vWCscqOwpQJHr-140kEXoMkzCTYWN9-AbbE3uKtNjZdocDKmrhBqc8-Y1UvbK4TluHGZGmSeVyGkSvHE-iHL7g27ky87jmhqtQS75xXHuKRJJwVZsEuT4co73DlW4wghFGve4JIaWbC1UC8b2mlWXLLCtvTRdfnD6_x1qB3Jd_2Y9QRqSGVjObwNYIiBrspWEn1AGaMg8SsT0eXlLbEvcB_nxRgwq7zRaaD6_sSbrtOaR7mGBDGAgOlQ_UdzWXD56I3Co04nAv-ZPv8FVlXh3xC9QQd3uyEt2jJW1Bd5w-Ru_zdz8aQeqKCvwJgbRJ66MrQfLPhgRDxq9BL176xuvEptVQme8qFwxJnBO9N5_RCqoUu9SkchLTGBTqHw-7NqE094I9AFI1q420w9DVNooYlAn24om3tDXdzfc_fmf3vCXDZZSXP2Awr1XlA8mQaAck-GjF2MP7M4XRR5sHhXO4mRaUzfK78TaTwF0wwTjiCKyK_UKha8F9Cwe6VdXJ-5gf1C4WyiKWFSFcG5PY19BlpIREXne7UwTFLlm5Yr5XVfkDp8_7zS7s6FRN1B4xfA39QShCQdWpL5yNdywrdDJ9dplPOpl5mLTYS8q72yh63PSD22JmXE6a6UeRADuCfep8u-V2Ntb6yFGdUEuCKPBlrcQLLlbHasRFT5eGZvAZUkdPXpfd_LEx5daKCBf9EyUeAHs6ML7uy7Rf7qD9QzDHJJHUQg5Zoc0Gd8zoXNVf73SUXUTBwRxpD5UghOCzaTkIq891ZsixwbuU93mD22Aww_nbOxVGlXsr9bo7tBxXMc0cJSrwfHhADShi-N3_Za0R_En2bN0xYCbfBm3bpGXYFbf3xFi0Zr0sCBSnuaJ0oLOm9HCUxsE8_Q-HkehIVQxtAdKKcYizU8jz05sN32H6wd1CSbuUCuJiBJlxLt0_SBeIV6nWax4MHOQtgYsGTmyBI18bofdWYhLamY5oNol5226WwEZHClZrxdrMLV4CdeBIpN7gFCnc-zGIFzIR15ivAupbu5pI5DiGkUKOn01yVnsrj9BVXIC2rY1nKR93N3fEN4VrJ4cUW3toCm7xwPQablnuSclGzJE92U9IPLvdRGS0mySWzBGdb-QUzfnx3o1dEK15DQtIoep9b5dMTRHBogCloi48mflrqM9b6LUMEoz7e2heyd6lk85YGnJrHXRjeHIdztxLDJ6WQfpJgvreXl2BGeOVY8hPKDfsSZEaB4kp4xxgwHcFZNtfQqpGZslS02BBa0ukormpN88w4EbsPpt02zZ6i3WGn3tyx0KL3ymlfClHjfJSxu_MoJkSGy9CCz24jEopV6fSPLmQptIBDYNekQXA3DhZhNhWwFHZFGUCj4YFsQ6kZC';
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN, fetch });

const localFileName = process.argv[2]; 

async function runLab() {
    try {
        if (!localFileName) {
            console.log('Ошибка: Вы не указали имя файла!');
            console.log('Использование: node app.js <имя_файла>');
            return;
        }

        console.log(`--- Работаем с файлом: ${localFileName} ---`);

        if (!fs.existsSync(localFileName)) {
            throw new Error(`Файл "${localFileName}" не найден в текущей папке.`);
        }

        const fileContent = fs.readFileSync(localFileName);
        
        await dbx.filesUpload({
            path: '/' + localFileName,
            contents: fileContent,
            mode: 'overwrite'
        });

        console.log('Файл успешно улетел в облако!');

        const list = await dbx.filesListFolder({ path: '' });
        console.log('\nТекущие файлы в Dropbox:');
        list.result.entries.forEach(item => console.log(` - ${item.name}`));

    } catch (error) {
        console.error('Ошибка:', error.message || error);
    }
}

runLab();