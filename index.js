const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const nodemailer = require("nodemailer");

const token = '1871483695:AAGZ6bZIrGOMYoQ8Miffj9hJusXXouyZBjY';
const bot = new TelegramBot(token, { polling: true });
var baseurl = 'https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByPin?';

const isNumber = (n) => { return /^-?[\d.]+(?:e-?\d+)?$/.test(n); }
bot.onText(/\/echo (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const resp = match[1];
    bot.sendMessage(chatId, resp);
});
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    var d = msg.text.split(" ");
    var email = d[1];
    if (isNumber(d[0])) {
        var pincode = d[0];
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
        var today = dd + '-' + mm + '-' + yyyy;
        var query = 'pincode=' + pincode + '&date=' + today.toString();
        axios.get(baseurl + encodeURI(query), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.76 Safari/537.36' }
            },
            (res) => {
                res.data
            }).then((response) => {
            if (response.data.centers.length == 0) {
                bot.sendMessage(chatId, "No Centers Available");
            } else {
                var details = "";
                for (i = 0; i < response.data.centers.length; i++) {
                    for (var j = 0; j < response.data.centers[i].length; j++) {
                        if (response.data.centers[i][j]["available_capacity"] > 0) {
                            details += 'Pincode: ' + pincode.toString() + `Available on: ${today.toString()}` + " " + response.data.centers[i]["name"].toString() + `${response.data.centers[i]["block_name"]}` + "  Price:", response.data.centers[i]["fee_type"].toString();
                            details += "  Availablity: " + response.data.centers[i][j]["available_capacity"].toString();
                        }
                        if (response.data.centers[i][j]["vaccine"] != '') {
                            details += `\t Vaccine type: ${response.data.centers[i][j]["vaccine"]}`;
                            details += "\n";
                        }
                    }
                }
                if (details = " ") {
                    details += "No Vaccinations available";
                    bot.sendMessage(chatId, details);
                } else {
                    console.log(details);
                    var reply = sendMail({ email, msg: details })
                    reply.then((data) => {
                        bot.sendMessage(chatId, `${details} \n Please Check you mail ${email} or visit ${data}`);
                    })
                }
            }
        }).catch((error) => {
            console.log(error);
            bot.sendMessage(chatId, 'Message format "pincode EmailID"');
        })
    }
});

bot.on("polling_error", console.log);

const sendMail = async(data) => {
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