const axios = require('axios');
const nodemailer = require("nodemailer");
const jsonfile = require('jsonfile');
var cron = require('node-cron');

var TelegramBot = require('node-telegram-bot-api'),
    port = process.env.PORT || 443,
    host = process.env.host | '0.0.0.0',
    externalUrl = process.env.CUSTOM_ENV_VARIABLE || 'https://cowintelegram.herokuapp.com/',
    token = process.env.TOKEN,
    bot = new TelegramBot('1871483695:AAGZ6bZIrGOMYoQ8Miffj9hJusXXouyZBjY', { polling: true });
bot.setWebHook(externalUrl + ':443/bot' + token);
var baseurl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?';

bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const resp = match[1];
    bot.sendMessage(chatId, resp);
});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    if (msg.text == '/start') {
        bot.sendMessage(chatId, 'Hi There, Please send message in this format only ```pincode email true``` \r\n ex: 530046 mail@mail.com true');
    }
    if (msg.text == "cool") {
        bot.sendMessage(chatId, 'Hi bro');
    }
    console.log(msg.text);
    var d = msg.text.split(" ");
    var email = d[1];
    var setReainder = d[2];
    if (isNumber(d[0])) {
        var pincode = d[0];
        var today = getDate();
        var query = 'pincode=' + pincode + '&date=' + today.toString();
        var newData;
        axios.get(baseurl + encodeURI(query), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36',
            }
        }, (res) => {
            res.data
        }).then((response) => {
            if (response.data.centers.length == 0) {
                jsonfile.readFile('data.json', function (err, obj) {
                    if (err) console.error(err)

                    obj.push({ email: email, pincode: pincode, chatId: msg.chat.id, });
                    jsonfile.writeFile('data.json', obj);
                })
                bot.sendMessage(chatId, "No Centers Available");
            } else {
                var centerNames = "";
                var details = "";
                for (i = 0; i < Object.keys(response.data.centers).length; i++) {
                    var flag = false;
                    for (var j = 0; j < Object.keys(response.data.centers[i].sessions).length; j++) {
                        if (response.data.centers[i].sessions[j]["available_capacity"] > 0) {
                            flag = true;
                            centerNames += `\r\n\r\n<b><strong>${response.data.centers[i]["name"]}</strong></b>`;
                            details += `\r\nMinAge Limit: ${response.data.centers[i].sessions[j].min_age_limit} \r\n${response.data.centers[i]["name"]}` + "\r\n BLock Name:" + `${response.data.centers[i]["block_name"]}` + '\r\nAvailable capacity:' +
                                response.data.centers[i].sessions[j]["available_capacity"].toString();
                            details += `\r\nAvailable on: ${today.toString()}`;
                            details += '\r\n slots \r\n';
                            for (var k = 0; k < Object.keys(response.data.centers[i].sessions[j].slots).length; k++) {
                                details += `${response.data.centers[i].sessions[j].slots[k]}` + '\r\n';
                            }
                            details += `available_capacity_dose1: ${response.data.centers[i].sessions[j].available_capacity_dose1}\r\navailable_capacity_dose2: ${response.data.centers[i].sessions[j].available_capacity_dose2}`;
                            if (response.data.centers[i].sessions[j]["vaccine"] != '') {
                                details += `\r\nVaccine type: ${response.data.centers[i].sessions[j]["vaccine"]}\r\n`;
                            }
                        }
                    }
                    if (flag && response.data.centers[i]["fee_type"] == "Paid") {
                        for (j = 0; j < Object.keys(response.data.centers[i]["vaccine_fees"]).length; j++) {
                            details += `${response.data.centers[i].vaccine_fees[j].vaccine} Price: ${response.data.centers[i]["vaccine_fees"][j]["fee"]}\r\n\r\n`;
                        }
                        flag = false;
                    }
                }
                if (details == '') {
                    jsonfile.readFile('data.json', function (err, obj) {
                        if (err) console.error(err)

                        obj.push({ email: email, pincode: pincode, chatId: msg.chat.id, });
                        jsonfile.writeFile('data.json', obj);
                    })
                    details += centerNames + "\r\n No Vaccinations available";
                    bot.sendMessage(chatId, details);
                } else {
                    if (centerNames != '') {
                        jsonfile.readFile('data.json', function (err, obj) {
                            if (err) console.error(err)

                            obj.push({ email: email, pincode: pincode, chatId: msg.chat.id, });
                            jsonfile.writeFile('data.json', obj);
                        })
                        var reply = sendMail({ email, msg: details })
                        reply.then((data) => {
                            bot.sendMessage(chatId, `Please visit ${data} \r\n ${details}`);
                        })

                    } else {
                        bot.sendMessage(chatId, "Currently there are no centers available");
                        jsonfile.readFile('data.json', function (err, obj) {
                            if (err) console.error(err)

                            obj.push({ email: email, pincode: pincode, chatId: msg.chat.id, });
                            jsonfile.writeFile('data.json', obj);
                        })
                    }
                }
            }
        }).catch((error) => {
            console.log(error);
            bot.sendMessage(chatId, msg.text + " " + error.response.status + ' Message format "pincode EmailID"');
        })
    } else {
        bot.sendMessage(chatId, msg.text + " " + error.response.status + ' Message format "pincode EmailID"');
    }
});


//CRON JOB function
const checkForSLots = () => {
    var newData;
    jsonfile.readFile('data.json', function (err, obj) {
        if (err) console.error(err)
        newData = obj;
        for (data in newData) {
            var today = getDate();
            const { chatId, email, pincode } = newData[data];
            var query = 'pincode=' + pincode + '&date=' + today.toString();
            axios.get(baseurl + encodeURI(query), {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36',
                }
            }, (res) => {
                res.data
            }).then((response) => {
                if (response.data.centers.length == 0) {
                    // bot.sendMessage(chatId, "No Centers Available");
                } else {
                    var centerNames = "";
                    var details = "";
                    for (i = 0; i < Object.keys(response.data.centers).length; i++) {
                        var flag = false;
                        for (var j = 0; j < Object.keys(response.data.centers[i].sessions).length; j++) {
                            if (response.data.centers[i].sessions[j]["available_capacity"] > 0) {
                                flag = true;
                                centerNames += `\r\n\r\n<b><strong>${response.data.centers[i]["name"]}</strong></b>`;
                                details += `\r\nMinAge Limit: ${response.data.centers[i].sessions[j].min_age_limit} \r\n${response.data.centers[i]["name"]}` + "\r\n BLock Name:" + `${response.data.centers[i]["block_name"]}` + '\r\nAvailable capacity:' +
                                    response.data.centers[i].sessions[j]["available_capacity"].toString();
                                details += `\r\nAvailable on: ${today.toString()}`;
                                details += '\r\n slots \r\n';
                                for (var k = 0; k < Object.keys(response.data.centers[i].sessions[j].slots).length; k++) {
                                    details += `${response.data.centers[i].sessions[j].slots[k]}` + '\r\n';
                                }
                                details += `available_capacity_dose1: ${response.data.centers[i].sessions[j].available_capacity_dose1}\r\navailable_capacity_dose2: ${response.data.centers[i].sessions[j].available_capacity_dose2}`;
                                if (response.data.centers[i].sessions[j]["vaccine"] != '') {
                                    details += `\r\nVaccine type: ${response.data.centers[i].sessions[j]["vaccine"]}\r\n`;
                                }
                            }
                        }
                        if (flag && response.data.centers[i]["fee_type"] == "Paid") {
                            for (j = 0; j < Object.keys(response.data.centers[i]["vaccine_fees"]).length; j++) {
                                details += `${response.data.centers[i].vaccine_fees[j].vaccine} Price: ${response.data.centers[i]["vaccine_fees"][j]["fee"]}\r\n\r\n`;
                            }
                            flag = false;
                        }
                    }
                    if (details == '') {

                        details += centerNames + "\r\n No Vaccinations available";
                        bot.sendMessage(chatId, details);
                    } else {
                        if (centerNames != '') {
                            var reply = sendMail({ email, msg: details })
                            reply.then((data) => {
                                bot.sendMessage(chatId, `Please visit ${data} \r\n ${details}`);
                            })
                        } else {
                            bot.sendMessage(chatId, "Currently there are no centers available");
                        }
                    }
                }
            }).catch((error) => {
                console.log(error);
                bot.sendMessage(chatId, msg.text + " " + error.response.status + ' Message format "pincode EmailID"');
            })
        }
    });
}

//helpers functions

cron.schedule('*/45 * * * *', () => {
    console.log('running a task every 45 minutes');
    checkForSLots();
});

const isNumber = (n) => {
    return /^-?[\d.]+(?:e-?\d+)?$/.test(n);
}

const getDate = () => {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1;
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd;
    }
    if (mm < 10) {
        mm = '0' + mm;
    }
    return today = dd + '-' + mm + '-' + yyyy;
}
const sendMail = async (data) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
            user: 'prince.lubowitz35@ethereal.email',
            pass: 'GYvgkpKeVDYmETk83A'
        }
    });
    info = await transporter.sendMail({
        from: '"cowin-telegram 👻" <foo@example.com>', // sender address
        to: data.email, // list of receivers
        subject: "[IMPORTANT] Cowin Telegram reply", // Subject line
        text: data.msg,
    });
    var reply = nodemailer.getTestMessageUrl(info);
    return reply;
}