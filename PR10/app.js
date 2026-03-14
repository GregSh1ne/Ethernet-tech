const { Dropbox } = require('dropbox');
const fetch = require('isomorphic-fetch');
const fs = require('fs');

const ACCESS_TOKEN = 'sl.u.AGUlHSGn_jsnAadwOYuufI6drN4JiTnj8pFJwrs3ApWY2tf_i1bjWsh7SUGYhWimVKcEE6b2on-NRmfsYfR3Nc77VLohn8GglI8GM9PYFbhcnLH8E7BfBS0-mB0CkpbpCkix5hqGYDNISm0aIispjt8qDn72zyEDJdBaxjyosUE3PDpdEon5_Gpnfv7n34enU2_lSua79bY1hPQL2odU1RK2ZLlL08c2HBvicCv-G2VKy_oE8n75PlR6KkX0XNbUzMWUTPZybaTYBexQEA5h_5V3iB-CtXD0Nv63mejmEmK7z2iPMHHFVC8Qe5XjAwWBgV8u0qxcEajbkSAXjEcGkba19T09HFR_PEXUG1CiXiHiUvManw5LXuUManyg6Hi6NbcSHl-dKD4fNBk5YdfGHmghLEfaJlhvafxf0OSQAa8AJtQQe1bU6AevB_hQty_QmBq6cGSjsw183P6ewh8z08B1blgTrQgTQKy9uBjzPrlUvnVqiyiy1G-fp3ROdgG2iTTvk7hP5cMoh76oKscZSHTwUMkhSWSBFf9RhucXZBmfjqEbekkxsYRkzfSIJ_TWdm6Jnh1-GoCWF2R4wcRMg2Yfb4MaBGCnNKl7_7EshZWNgOZkiO_9Py15lAlRi_BUjplGep1JDlnek1prsb8Tfzk3MSoGCj8f2DBVrsOYR69eB8XBEox5FuCpd_FC5cfK6Ki-tkXq6r4Twa7d0-9pWKnxxkrKiooFdrNN_V41tXJpMQvutPzq0siuApVjfyLanluaxaLyEUM4QtXXTxkw3tGifTie-aknjbfqyqzKen3E4YuEgnQwnh6cZVC_lWwKgAEZ649sBQBYIONORbqzBLvH6G7B8XPmVLUeu0iZGCHvBZ8rx6oZ05ls2YFiMbTia6ZEX1osFACTym0AtXhZPw78DxJQj2Srg7Bp-CQxlrkTlpDKwiRyWSbaxhd_TaoIYWcJx2Bch2cvsuPK_fsEBfDdydYh4xSlodYnLjA1XFPzLasetJSzKxtOL5bHJZdeC9buHLwJ8g8LBKiusLxTeFH6vP5tsg6Q5zoucW3AjQJgDU1y8NAeENpalqf4IphLl9Z-ThrD75R_cBkoTJxv6KDljS7UIvJcf3pSx9qgZ-Bo2dMGuF60_5Nq17vpWG2ARL7qBMoCcFjC4N5u0h9pp3RQ_op-1svlap-ikKVgjML9uwn22ksz6GMMMt8ILbDe0yAFTRWaMAC74gjBLeoHXsBHZ14gQ8zZnbpjb7xoTrN_KEJZB8DSy_neMBH7Ar9leDmyD9GAur_aeeHW6wHVa9zIYjZxG6ONu54vjBPmx7Y7QWDfZ-NDIrtXqalBkhUVx4NlMvu8mXYa9mmWJcvyqox6r0w2FdqdHc5XE8DtV8HLjt26yOn6X_rKxPzez08byl4NKqI3cDOB6mTnxLlfNJ1KrG9gfv5lDR5-P1233Pax6oYIYa43JjxTEHAH-kK0MdyEAUULanauZwAmKfAc34wo';
const dbx = new Dropbox({ accessToken: ACCESS_TOKEN, fetch });

const localFileName = process.argv[2]; 

async function runLab() {
    try {
        if (!localFileName) {
            console.log('❌ Ошибка: Вы не указали имя файла!');
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

        console.log('✅ Файл успешно улетел в облако!');

        const list = await dbx.filesListFolder({ path: '' });
        console.log('\nТекущие файлы в Dropbox:');
        list.result.entries.forEach(item => console.log(` - ${item.name}`));

    } catch (error) {
        console.error('❌ Ошибка:', error.message || error);
    }
}

runLab();