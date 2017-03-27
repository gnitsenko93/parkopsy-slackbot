const User = require('./user');
const Owner = require('./owner');
const Tenant = require('./tenant');
const ParkingPlace = require('./parkingplace');

const schedule = require("node-schedule");
const moment = require('moment');

const Botkit = require('botkit');
const os = require('os');

const controller = Botkit.slackbot({
    debug: true,
    json_file_store: './lib/storage/data'
});

controller.spawn({
    token: process.env.TOKEN,
    retry: 'Infinity',
    stale_connection_timeout: 1000
}).startRTM();

module.exports = controller;

controller.hears(['sign me up'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.startConversation(message, (err, convo) => {
                    convo.say('Hello there! Remember, you can stop the conversion with *exit* message.');
                    convo.ask('What is your first name?', [
                        {
                            pattern: 'exit',
                            callback: (response, convo) => {
                                convo.say('OK, maybe next time!');
                                convo.next();
                            }
                        },
                        {
                            pattern: '^[a-zA-Z]+$',
                            callback: (response, convo) => {
                                let firstName = response.match[0];
                                convo.ask('Got you, '+firstName+'! What is your last name?', [
                                    {
                                        pattern: 'exit',
                                        callback: (response, convo) => {
                                            convo.say('OK, maybe next time!');
                                            convo.next();
                                        }
                                    },
                                    {
                                        pattern: '^[a-zA-Z]+$',
                                        callback: (response, convo) => {
                                            let lastName = response.match[0];
                                            convo.ask('Prettiest name I have ever heard! Tell me your phone number, please. (_89xxxxxxxxx_)', [
                                                {
                                                    pattern: '89[0-9]{9}',
                                                    callback: (response, convo) => {
                                                        let phoneNumber = response.match[0];
                                                        convo.ask('Thank you! So are you a parking place owner or a tenant? (_owner_/_tenant_)', [
                                                            {
                                                                pattern: 'owner',
                                                                callback: (response, convo) => {
                                                                    convo.ask('Okey then. What is your parking place number?', [
                                                                        {
                                                                            pattern: '[0-9]+',
                                                                            callback: (response, convo) => {
                                                                                let owner = new Owner(message, firstName, lastName, phoneNumber, +response.match[0]);
                                                                                controller.storage.users.save(owner, (err) => {
                                                                                    if (!err) {
                                                                                        convo.say('OK, nice to meet you, ' + owner.firstName + '!\n' +
                                                                                                   'Your account was created.');
                                                                                        convo.next();
                                                                                    }
                                                                                    else {
                                                                                        convo.say('Opps, something goes wrong! Try again.\n' +
                                                                                                    'No data was saved so use *sign me up* command once again.');
                                                                                        convo.next();
                                                                                    }
                                                                                });
                                                                                convo.next();
                                                                            }
                                                                        },
                                                                        {
                                                                            pattern: 'exit',
                                                                            callback: (response, convo) => {
                                                                                convo.say('OK, maybe next time!');
                                                                                convo.next();
                                                                            }
                                                                        },
                                                                        {
                                                                            default: true,
                                                                            callback: (response, convo) => {
                                                                                convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                                                convo.repeat();
                                                                                convo.next();
                                                                            }
                                                                        }
                                                                    ]);
                                                                    convo.next();
                                                                }
                                                            },
                                                            {
                                                                pattern: 'tenant',
                                                                callback: (response, convo) => {
                                                                    let tenant = new Tenant(message, firstName, lastName, phoneNumber);
                                                                    controller.storage.users.save(tenant, (err) => {
                                                                        if (!err) {
                                                                            convo.say('OK, nice to meet you, ' + tenant.firstName + '!\n' +
                                                                                        'Your account was created.');
                                                                            convo.next();
                                                                        }
                                                                        else {
                                                                            convo.say('Opps, something goes wrong! Try again.\n' +
                                                                                        'No data was saved so use *sign me up* command once again.');
                                                                            convo.next();
                                                                        }
                                                                    });
                                                                    convo.next();
                                                                }
                                                            },
                                                            {
                                                                pattern: 'exit',
                                                                callback: (response, convo) => {
                                                                    convo.say('OK, maybe next time!');
                                                                    convo.next();
                                                                }
                                                            },
                                                            {
                                                                default: true,
                                                                callback: (response, convo) => {
                                                                    convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                                    convo.repeat();
                                                                    convo.next();
                                                                }
                                                            }
                                                        ]);
                                                        convo.next();
                                                    }
                                                },
                                                {
                                                    pattern: 'exit',
                                                    callback: (response, convo) => {
                                                        convo.say('OK, maybe next time!');
                                                        convo.next();
                                                    }
                                                },
                                                {
                                                    default: true,
                                                    callback: (response, convo) => {
                                                        convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                        convo.repeat();
                                                        convo.next();
                                                    }
                                                }
                                            ]);
                                            convo.next();
                                        }
                                    },
                                    {
                                        default: true,
                                        callback: (response, convo) => {
                                            convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }
                                ]);
                                convo.next();
                            }
                        },
                        {
                            default: true,
                            callback: (response, convo) => {
                                convo.say('Sorry, I did not understand you.');
                                convo.repeat();
                                convo.next();
                            }
                        }
                    ]);
                });
            }
            else {
                let user = User.fromJSON(data);
                bot.reply(message,
                    'We have found your account, ' + user.fullName + '.\n' +
                    'If you want to update your account, use *update me* command.\n' +
                    'If you want to remove your account, use *remove account* command.');
            }

        });
    });

controller.hears(['update me'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'We have not found your account.\n' +
                    'If you want to create an account, use *sign me up* command.\n');
            }
            else {
                bot.startConversation(message, (err, convo) => {
                    convo.ask('Okey, '+data.firstName+'. What do you want to update? (_name_, _phone_, _place_)', [
                        {
                            pattern: 'name',
                            callback: (response, convo) => {
                                convo.ask('What is your full name then? (example: Ivan Ivanov)', [

                                    {
                                        pattern: 'exit',
                                        callback: (response, convo) => {
                                            convo.say('OK, maybe next time!');
                                            convo.next();
                                        }
                                    },
                                    {
                                        pattern: '[a-zA-Z]+ [a-zA-Z]+',
                                        callback: (response, convo) => {
                                            [data.firstName, data.lastName] = response.match[0].split(' ');
                                            controller.storage.users.save(data, (err) => {
                                               if (err) {
                                                   bot.reply(message,
                                                       'Opps, something goes wrong! Try again.\n' +
                                                       'No data was saved so use *update me* command once again.');
                                               }
                                               else {
                                                   bot.reply(message,
                                                    'Your name was updated successfully.');
                                               }
                                            });
                                            convo.next();
                                        }
                                    },
                                    {
                                        default: true,
                                        callback: (response, convo) => {
                                            convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }
                                ]);
                                convo.next();
                            }
                        },
                        {
                            pattern: 'phone',
                            callback: (response, convo) => {
                                convo.ask('Okey, '+data.firstName+'. What is you phone number then?', [
                                    {
                                        pattern: '89[0-9]{9}',
                                        callback: (response, convo) => {
                                            data.phoneNumber = response.match[0];
                                            controller.storage.users.save(data, (err) => {
                                                if (err) {
                                                    bot.reply(message,
                                                        'Opps, something goes wrong! Try again.\n' +
                                                        'No data was saved so use *update me* command once again.');
                                                }
                                                else {
                                                    bot.reply(message,
                                                        'Your contact phone number was updated successfully.');
                                                }
                                            });
                                            convo.next();
                                        }
                                    },
                                    {
                                        pattern: 'exit',
                                        callback: (response, convo) => {
                                            convo.say('OK, maybe next time!');
                                            convo.next();
                                        }
                                    },
                                    {
                                        default: true,
                                        callback: (response, convo) => {
                                            convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                            convo.repeat();
                                            convo.next();
                                        }
                                    }
                                ]);
                                convo.next();
                            }
                        },
                        {
                            pattern: 'place',
                            callback: (response, convo) => {
                                if (data.userType === 'OWNER') {
                                    convo.ask('Allright, '+data.firstName+'! What is your parking place number then?', [
                                        {
                                            pattern: '[0-9]+',
                                            callback: (response, convo) => {
                                                let owner = Owner.fromJSON(data);
                                                owner.parking = response.match[0];
                                                controller.storage.users.save(owner, (err) => {
                                                    if (err) {
                                                        bot.reply(message,
                                                            'Opps, something goes wrong! Try again.\n' +
                                                            'No data was saved so use *update me* command once again.');
                                                    }
                                                    else {
                                                        bot.reply(message,
                                                            'You parking place number was updated successfully.');
                                                    }
                                                });
                                                convo.next();
                                            }
                                        },
                                        {
                                            pattern: 'exit',
                                            callback: (response, convo) => {
                                                convo.say('OK, maybe next time!');
                                                convo.next();
                                            }
                                        },
                                        {
                                            default: true,
                                            callback: (response, convo) => {
                                                convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                                convo.repeat();
                                                convo.next();
                                            }
                                        }
                                    ]);
                                    convo.next();
                                }
                                else {
                                    convo.say('Sorry, '+data.firstName+', but you have a tenant account and do not have parking place.\n' +
                                              'Remove you account with *remove account* command and try to create another type of account with *sign me up* command.');
                                    convo.next();
                                }
                            }
                        },
                        {
                            pattern: 'exit',
                            callback: (response, convo) => {
                                convo.say('OK, maybe next time!');
                                convo.next();
                            }
                        },
                        {
                            default: true,
                            callback: (response, convo) => {
                                convo.say('Sorry, I did not understand you. You can send *exit* message in any moment to stop the conversation.');
                                convo.repeat();
                                convo.next();
                            }
                        }
                    ])
                });
            }

        });
    });

controller.hears(['remove account'],
    'direct_message', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You do not have an account.\n' +
                    'Use *sign me up* command.');
            }
            else {
                controller.storage.users.delete(data, (err) => {
                    if (typeof err === 'undefined') {
                        bot.reply(message, 'All your user information was removed.');
                    }
                    else {
                        bot.reply(message,
                            'Opps, something goes wrong! Try again.\n' +
                            'No data was saved so use *update me* command once again.')
                    }
                });
            }
        });
    });

controller.hears(['my info'],
    'direct_message,direct_mention,mention', (bot, message) => {
        controller.storage.users.get(message.user, (err, data) => {
            if (typeof data === 'undefined') {
                bot.reply(message,
                    'You have not signed up yet. ' +
                    'Use *sign me up* command.\n');
            }
            else {
                let user;

                switch(data.userType) {
                    case 'OWNER': user = Owner.fromJSON(data); break;
                    case 'TENANT': user = Tenant.fromJSON(data); break;
                    default: user = User.fromJSON(data); break;
                }

                bot.reply(message, user.info);
            }
        })
    });


controller.hears(['vacations (.*)'],
    'direct_message,direct_mention,mention', function (bot, message) {
        const dates = message.match[1];
        const pattern = /(\d{4}-\d{2}-\d{2}) (\d{4}-\d{2}-\d{2})/;
        if (pattern.test(dates)) {
            const vacations_from = moment(pattern.exec(dates)[1]);
            const vacations_to = moment(pattern.exec(dates)[2]);
            if (vacations_from.isValid() && vacations_to.isValid()) {
                if (vacations_to.diff(vacations_from, 'days') > 0) {
                    controller.storage.users.get(message.user, function (err, user) {
                        if (!user) {
                            bot.reply(message,
                                'You have not registered yet.' +
                                'Use ready to share [parking number] command.\n');
                        }
                        else {

                            user.parkingPlace.freeDates.push(
                                {
                                    from: vacations_from,
                                    to: vacations_to
                                }
                            );

                            user.parkingPlace.freeDates = optimizeDates(user.parkingPlace.freeDates);

                            controller.storage.users.save(user, function (err, id) {
                                bot.reply(message, 'Got it. I will remember your days off.');
                            })
                        }
                    });
                }
                else {
                    bot.reply(message, 'Dates format is incorrect.\n' +
                        'Vacations start ' + vacations_from.format('MMMM Do YYYY') +
                        ' must be earlier than end ' + vacations_to.format('MMMM Do YYYY') + '.');
                }
            }
            else {
                bot.reply(message, 'Dates format is incorrect.\n' +
                    'Use vacations YYYY-MM-DD YYYY-MM-DD.');
            }
        }
        else {
            bot.reply(message, 'Dates format is incorrect.\n' +
                'Use vacations YYYY-MM-DD YYYY-MM-DD.');
        }
    });

controller.hears(['cancel vacations'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.get(message.user, function (err, user) {
            if (!user) {
                bot.reply(message,
                    'You have not registered yet.' +
                    'Use ready to share [parking number] command.\n');
            }
            else {
                if (user.parkingPlace.freeDates.length === 0) {
                    bot.reply(message,
                        'You do not have days off.\n' +
                        'Use vacations YYYY-MM-DD YYYY-MM-DD command to add one.')
                }
                else {
                    user.parkingPlace.freeDates = [];
                    controller.storage.users.save(user, function (err, id) {
                        bot.reply(message, 'Your days off were cleaned up.')
                    })
                }
            }
        })
    });

controller.hears(['free (.*)', 'free'],
    'direct_message,direct_mention,mention', function (bot, message) {

        const days = message.match[1];
        controller.storage.users.get(message.user, function (err, user) {

            if (!user) {
                bot.reply(message, 'You have not registered yet.' +
                    'Use ready to share [parking number] command.\n');
            }
            else {
                if (user.parkingPlace.status === 'free' && typeof(days) === 'undefined') {
                    bot.reply(message, 'You parking place is already free for today.');
                }
                else {
                    if (user.parkingPlace.status === 'busy' && user.parkingPlace.tenant !== '' && typeof(days) === 'undefined') {
                        bot.reply(message, 'It is not possible to change parking place status since ' + user.parkingPlace.tenant + ' has already rent it for today.');
                    }
                    else {
                        if (user.parkingPlace.status === 'busy' && user.parkingPlace.tenant !== '' && typeof(days) !== 'undefined') {
                            bot.reply(message, 'Please, use vacations [YYYY-MM-DD] [YYYY-MM-DD] command to plan your days off.\n' +
                                user.parkingPlace.tenant + ' has already rent your place for today.');
                        }

                        else {
                            {
                                if (typeof(days) !== 'undefined') {
                                    const fromDate = moment();
                                    const toDate = moment();
                                    toDate.add(days, 'days');
                                    user.parkingPlace.freeDates.push(
                                        {
                                            from: fromDate,
                                            to: toDate
                                        }
                                    );
                                }

                                user.parkingPlace.status = 'free';
                                user.parkingPlace.freeDates = optimizeDates(user.parkingPlace.freeDates);

                                controller.storage.users.save(user, function (err, id) {
                                    if (typeof (days) === 'undefined') {
                                        bot.reply(message, 'Got it.\nYour parking place is free for today.');
                                    }
                                    else {
                                        bot.reply(message, 'Got it.\nYour parking place is free for today and ' + (days - 1) + ' next days.');
                                    }

                                    controller.storage.teams.get(message.team, function (err, team) {
                                        if (team) {
                                            if (team.userQueue.length > 0) {
                                                for (var i in team.userQueue) {
                                                    bot.reply(team.userQueue[i], 'Parking place is available! Use park me command to book it for today.');
                                                }
                                                team.userQueue = [];
                                                controller.storage.teams.save(team, function (err, id) {
                                                    console.log('Queue was updated.');
                                                });
                                            }
                                            else {
                                                console.log('Queue is empty at the moment.');
                                            }
                                        }
                                        else {
                                            console.log('No queue was created even once.');
                                        }
                                    });
                                });
                            }
                        }
                    }
                }
            }
        });
    });

controller.hears(['park me'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.all(function (err, users) {
            if (users) {
                for (let i in users) {
                    if (users[i].parkingPlace.status === 'free') {

                        users[i].parkingPlace.status = 'busy';
                        users[i].parkingPlace.tenant = message.user;

                        for (let j in users[i].parkingPlace.freeDates) {
                            if (moment().diff(moment(users[i].parkingPlace.freeDates[j].from), 'days') === 0 &&
                                moment().diff(moment(users[i].parkingPlace.freeDates[j].to), 'days') === 0) {
                                users[i].parkingPlace.freeDates.splice(j, 1);
                            }
                        }

                        controller.storage.users.save(users[i], function (err, id) {
                            bot.reply(message, 'Hey, lucky, you can park at ' + users[i].parkingPlace.number + '!');
                        });

                        return;
                    }
                }
            }

            controller.storage.teams.get(message.team, function (err, team) {
                if (!team) {
                    team = {
                        id: message.team,
                        userQueue: [message]
                    };
                    controller.storage.teams.save(team, function (err, id) {
                        bot.reply(message, 'You was added to queue and will be notified if there are free parking places.');
                    })
                }
                else {
                    team.userQueue.push(message);
                    controller.storage.teams.save(team, function (err, id) {
                        bot.reply(message, 'You was added to queue and will be notified if there are free parking places.');
                    })
                }
            });
        });
    });

controller.hears(['status'],
    'direct_message,direct_mention,mention', function (bot, message) {
        controller.storage.users.all(function (err, users) {
            if (users) {
                let freeParkingPlaces = 0;
                for (let i in users) {
                    if (users[i].parkingPlace.status === 'free') {
                        freeParkingPlaces = freeParkingPlaces + 1;
                    }
                }
                bot.reply(message, 'Current number of free parking places is ' + freeParkingPlaces + '.');
            }
            else {
                bot.reply(message, 'No users share there parking places.');
            }
        })
    });

schedule.scheduleJob('0 1 * * *', function () {
    controller.storage.users.all(function (err, users) {
        if (users) {
            for (let i in users) {
                if (users[i].parkingPlace.status === 'free') {
                    users[i].parkingPlace.status = 'busy';
                    users[i].parkingPlace.tenant = '';
                }
                else {
                    if (users[i].parkingPlace.tenant !== '') {
                        users[i].parkingPlace.tenant = '';
                    }
                }

                const currentDate = moment();
                for (let j in users[i].parkingPlace.freeDates) {
                    if (currentDate.diff(moment(users[i].parkingPlace.freeDates[j].from), 'days') >= 0 &&
                        currentDate.diff(moment(users[i].status.free_dates[j].to), 'days') <= 0) {
                        users[i].parkingPlace.status = 'free';
                    }
                }

                controller.storage.users.save(users[i], function (err, id) {
                    console.log('User ' + users[i].id + ' was updated at ' + new Date() + '.');
                })
            }
        }
    });

    controller.storage.teams.all(function (err, teams) {
        if (teams) {
            teams[0].userQueue = [];
            controller.storage.teams.save(teams[0], function (err, id) {
                console.log('Queue was cleaned up at ' + new Date() + '.');
            });
        }
        else {
            console.log('Queue was not updated at ' + new Date() + '.');
        }

    });
});

controller.hears(['help'],
    'direct_message,direct_mention,mention', function (bot, message) {

        bot.reply(message,
            'To start using ParkOpsy chatbot send *sign me up*\n.' +
            'To edit your account use *update me*.\n' +
            'To remove your account use *remove account*.\n' +
            'To view your account use *my info*.\n');
    });

controller.hears(['creators'],
    'direct_message', function (bot, message) {

        bot.reply(message,
            'Grigory Nitsenko \n' +
            'Elizaveta Belokopytova \n' +
            'Andrey Kalinin');
    });

